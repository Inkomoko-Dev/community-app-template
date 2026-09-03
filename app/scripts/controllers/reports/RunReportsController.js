(function (module) {
    mifosX.controllers = _.extend(module, {

        RunReportsController: function (scope, routeParams, resourceFactory, location, dateFilter, http, API_VERSION, $rootScope, $sce, $log) {
            scope.isCollapsed = false; //displays options div on startup
            scope.hideTable = true; //hides the results div on startup
            scope.hidePentahoReport = true; //hides the results div on startup
            scope.hideChart = true;
            scope.piechart = false;
            scope.barchart = false;
            scope.formData = {};
            scope.reportParams = new Array();
            scope.reportDateParams = new Array();
            scope.reqFields = new Array();
            scope.reportTextParams = new Array();
            scope.reportData = {};
            scope.reportData.columnHeaders = [];
            scope.reportData.data = [];
            scope.baseURL = "";
            scope.reportName = routeParams.name;
            scope.reportType = routeParams.type;
            scope.reportId = routeParams.reportId;
            scope.pentahoReportParameters = [];
            scope.type = "pie";
            scope.recordsPerPage = 15;
            scope.exporting = false;

            scope.highlight = function (id) {
                var i = document.getElementById(id);
                if (i.className == 'selected-row') {
                    i.className = 'text-pointer';
                } else {
                    i.className = 'selected-row';
                }
            };
            if (scope.reportType == 'Pentaho') {
                scope.formData.outputType = 'HTML';
            };

            resourceFactory.runReportsResource.getReport({reportSource: 'FullParameterList', parameterType: true, R_reportListing: "'" + routeParams.name + "'"}, function (data) {

                for (var i in data.data) {
                    var temp = {
                        name: data.data[i].row[0],
                        variable: data.data[i].row[1],
                        label: data.data[i].row[2],
                        displayType: data.data[i].row[3],
                        formatType: data.data[i].row[4],
                        defaultVal: data.data[i].row[5],
                        selectOne: data.data[i].row[6],
                        selectAll: data.data[i].row[7],
                        parentParameterName: data.data[i].row[8],
                        inputName: "R_" + data.data[i].row[1] //model name
                    };
                    scope.reqFields.push(temp);

                    if (temp.displayType === 'select' && temp.parentParameterName === null) {
                        if (temp.variable === 'currencyId' && scope.reportName === 'Loan payments due') {
                            scope.formData[temp.inputName] = '-1';
                        } else {
                            intializeParams(temp, {});
                        }
                    } else if (temp.displayType === 'date') {
                        if (temp.variable === 'asAtDate') {
                            scope.formData[temp.inputName] = dateFilter(new Date(), 'yyyy-MM-dd');
                        }
                        scope.reportDateParams.push(temp);
                    } else if (temp.displayType === 'text') {
                        if (temp.variable === 'gracePeriod') {
                            scope.formData[temp.inputName] = '0';
                        }
                        scope.reportTextParams.push(temp);
                    }
                }
                if (scope.reportName === 'Loan payments due') {
                    for (var i in scope.reqFields) {
                        var field = scope.reqFields[i];
                        if (field.variable === 'loanProductId') {
                            var params = {};
                            params['R_currencyId'] = '-1';
                            intializeParams(field, params);
                            break;
                        }
                    }
                }

            });

            if (scope.reportType == 'Pentaho') {
                resourceFactory.reportsResource.get({id: scope.reportId, fields: 'reportParameters'}, function (data) {
                    scope.pentahoReportParameters = data.reportParameters || [];
                });
            }

            function getSuccuessFunction(paramData) {
                var tempDataObj = new Object();
                var successFunction = function (data) {
                    var selectData = [];
                    var isExistedRecord = false;
                    for (var i in data.data) {
                        selectData.push({id: data.data[i].row[0], name: data.data[i].row[1]});
                    }
                    if(paramData.selectAll == 'Y'){
                        selectData.push({id: "-1", name: "All"});
                    }
                    for (var j in scope.reportParams) {
                        if (scope.reportParams[j].name == paramData.name) {
                            scope.reportParams[j].selectOptions = selectData;
                            isExistedRecord = true;
                        }
                    }
                    if (!isExistedRecord) {
                        paramData.selectOptions = selectData;
                        scope.reportParams.push(paramData);
                    }
                };
                return successFunction;
            }

            function intializeParams(paramData, params) {
                scope.errorStatus = undefined;
                scope.errorDetails = [];
                params.reportSource = paramData.name;
                params.parameterType = true;
                var successFunction = getSuccuessFunction(paramData);
                resourceFactory.runReportsResource.getReport(params, successFunction);
            }

            scope.getDependencies = function (paramData) {
                for (var i = 0; i < scope.reqFields.length; i++) {
                    var temp = scope.reqFields[i];
                    if (temp.parentParameterName == paramData.name) {
                        if (temp.displayType == 'select') {
                            var parentParamValue = this.formData[paramData.inputName];
                            if (parentParamValue != undefined) {
                                eval("var params={};params." + paramData.inputName + "='" + parentParamValue + "';");
                                intializeParams(temp, params);
                            }
                        } else if (temp.displayType == 'date') {
                            scope.reportDateParams.push(temp);
                        }
                    }
                }
            };

            scope.checkStatus = function () {
                var collapsed = false;
                if (scope.isCollapsed) {
                    collapsed = true;
                }
                return collapsed;
            };

            scope.exportToExcel = function () {
                downloadReport({exportXLSX: true}, scope.reportName + '.xlsx');
            };

            scope.exportToCsv = function () {
                downloadReport({exportCSV: true}, scope.reportName + '.csv');
            };

            function buildReportPayload(overrides) {
                var payload = angular.copy(scope.formData);
                delete payload.limit;
                delete payload.offset;
                delete payload.exportCSV;
                delete payload.exportXLSX;
                payload.reportSource = scope.reportName;
                return angular.extend(payload, overrides || {});
            }

            function normalizeDateParams() {
                for (var i in scope.reportDateParams) {
                    if (scope.formData[scope.reportDateParams[i].inputName]) {
                        scope.formData[scope.reportDateParams[i].inputName] = dateFilter(scope.formData[scope.reportDateParams[i].inputName], 'yyyy-MM-dd');
                    }
                }
            }

            function downloadReport(exportFlag, filename) {
                scope.errorDetails = [];
                removeErrors();
                normalizeDateParams();
                parameterValidationErrors();

                if (scope.errorDetails.length > 0) {
                    return;
                }

                var reportURL = $rootScope.hostUrl + API_VERSION + "/runreports/" + encodeURIComponent(scope.reportName);
                scope.exporting = true;

                http.get(reportURL, {responseType: 'blob', params: buildReportPayload(exportFlag)})
                    .then(function (response) {
                        var blob = new Blob([response.data], {type: response.headers('Content-Type')});
                        var objectUrl = window.URL.createObjectURL(blob);
                        var link = document.createElement('a');
                        link.href = objectUrl;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.setTimeout(function () {
                            window.URL.revokeObjectURL(objectUrl);
                        }, 0);
                    })
                    .catch(function (error) {
                        $log.error('Error downloading ' + filename);
                        $log.error(error);
                    })
                    .finally(function () {
                        scope.exporting = false;
                    });
            }

            function invalidDate(checkDate) {
                // validates for yyyy-mm-dd returns true if invalid, false is valid
                var dateformat = /^\d{4}(\-|\/|\.)\d{1,2}\1\d{1,2}$/;

                if (!(dateformat.test(checkDate))) {
                    return true;
                } else {
                    var dyear = checkDate.substring(0, 4);
                    var dmonth = checkDate.substring(5, 7) - 1;
                    var dday = checkDate.substring(8);

                    var newDate = new Date(dyear, dmonth, dday);
                    return !((dday == newDate.getDate()) && (dmonth == newDate.getMonth()) && (dyear == newDate.getFullYear()));
                }
            }

            function removeErrors() {
                var $inputs = $(':input');
                $inputs.each(function () {
                    $(this).removeClass("validationerror");
                });
            }

            function parameterValidationErrors() {
                var tmpStartDate = "";
                var tmpEndDate = "";
                scope.errorDetails = [];
                for (var i in scope.reqFields) {
                    var paramDetails = scope.reqFields[i];
                    switch (paramDetails.displayType) {
                        case "select":
                            if (paramDetails.variable === 'currencyId' && scope.reportName === 'Loan payments due') {
                                break;
                            }
                            var selectedVal = scope.formData[paramDetails.inputName];
                            if (selectedVal === undefined || selectedVal === null || selectedVal === '') {
                                var fieldId = '#' + paramDetails.inputName;
                                $(fieldId).addClass("validationerror");
                                var errorObj = new Object();
                                errorObj.field = paramDetails.inputName;
                                errorObj.code = 'error.message.report.parameter.required';
                                errorObj.args = {params: []};
                                errorObj.args.params.push({value: paramDetails.label});
                                scope.errorDetails.push(errorObj);
                            }
                            break;
                        case "date":
                            var tmpDate = scope.formData[paramDetails.inputName];
                            if (tmpDate == undefined || !(tmpDate > "")) {
                                var fieldId = '#' + paramDetails.inputName;
                                $(fieldId).addClass("validationerror");
                                var errorObj = new Object();
                                errorObj.field = paramDetails.inputName;
                                errorObj.code = 'error.message.report.parameter.required';
                                errorObj.args = {params: []};
                                errorObj.args.params.push({value: paramDetails.label});
                                scope.errorDetails.push(errorObj);
                            }
                            if (tmpDate && invalidDate(tmpDate) == true) {
                                var fieldId = '#' + paramDetails.inputName;
                                $(fieldId).addClass("validationerror");
                                var errorObj = new Object();
                                errorObj.field = paramDetails.inputName;
                                errorObj.code = 'error.message.report.invalid.value.for.parameter';
                                errorObj.args = {params: []};
                                errorObj.args.params.push({value: paramDetails.label});
                                scope.errorDetails.push(errorObj);
                            }

                            if (paramDetails.variable == "startDate") tmpStartDate = tmpDate;
                            if (paramDetails.variable == "endDate") tmpEndDate = tmpDate;
                            break;
                        case "text":
                            var selectedVal = scope.formData[paramDetails.inputName];
                            if (selectedVal === undefined || selectedVal === null || selectedVal === '') {
                                var fieldId = '#' + paramDetails.inputName;
                                $(fieldId).addClass("validationerror");
                                var errorObj = new Object();
                                errorObj.field = paramDetails.inputName;
                                errorObj.code = 'error.message.report.parameter.required';
                                errorObj.args = {params: []};
                                errorObj.args.params.push({value: paramDetails.label});
                                scope.errorDetails.push(errorObj);
                            } else if (paramDetails.variable === 'gracePeriod' && !/^\d+$/.test(selectedVal)) {
                                var fieldId = '#' + paramDetails.inputName;
                                $(fieldId).addClass("validationerror");
                                var errorObj = new Object();
                                errorObj.field = paramDetails.inputName;
                                errorObj.code = 'error.message.report.invalid.value.for.parameter';
                                errorObj.args = {params: []};
                                errorObj.args.params.push({value: paramDetails.label});
                                scope.errorDetails.push(errorObj);
                            }
                            break;
                        default:
                            var errorObj = new Object();
                            errorObj.field = paramDetails.inputName;
                            errorObj.code = 'error.message.report.parameter.invalid';
                            errorObj.args = {params: []};
                            errorObj.args.params.push({value: paramDetails.label});
                            scope.errorDetails.push(errorObj);
                            break;
                    }
                }

                if (tmpStartDate > "" && tmpEndDate > "") {
                    if (tmpStartDate > tmpEndDate) {
                        var errorObj = new Object();
                        errorObj.field = paramDetails.inputName;
                        errorObj.code = 'error.message.report.incorrect.values.for.date.fields';
                        errorObj.args = {params: []};
                        errorObj.args.params.push({value: paramDetails.label});
                        scope.errorDetails.push(errorObj);
                    }
                }
            }

            function buildReportParms() {
                var paramCount = 1;
                var reportParams = "";
                for (var i = 0; i < scope.reqFields.length; i++) {
                    var reqField = scope.reqFields[i];
                    for (var j = 0; j < scope.pentahoReportParameters.length; j++) {
                        var tempParam = scope.pentahoReportParameters[j];
                        if (reqField.name == tempParam.parameterName) {
                            var paramName = "R_" + tempParam.reportParameterName;
                            if (paramCount > 1) reportParams += "&"
                            reportParams += encodeURIComponent(paramName) + "=" + encodeURIComponent(scope.formData[scope.reqFields[i].inputName]);
                            paramCount = paramCount + 1;
                        }
                    }
                }
                return reportParams;
            }

            scope.xFunction = function () {
                return function (d) {
                    return d.key;
                };
            };
            scope.yFunction = function () {
                return function (d) {
                    return d.values;
                };
            };
            scope.setTypePie = function () {
                if (scope.type == 'bar') {
                    scope.type = 'pie';
                }
            };
            scope.setTypeBar = function () {
                if (scope.type == 'pie') {
                    scope.type = 'bar';
                }
            };
            scope.colorFunctionPie = function () {
                return function (d, i) {
                    return colorArrayPie[i];
                };
            };
            scope.isDecimal = function(index){
                if(scope.reportData.columnHeaders && scope.reportData.columnHeaders.length > 0){
                    for(var i=0; i<scope.reportData.columnHeaders.length; i++){
                        if(scope.reportData.columnHeaders[index].columnType == 'DECIMAL'){
                            return true;
                        }
                    }
                }
                return false;
            };
            scope.getResultsPage = function (pageNumber) {

                scope.errorDetails = [];
                removeErrors();

                //update date fields with proper dateformat
                normalizeDateParams();

                //Custom validation for report parameters
                parameterValidationErrors();

                if (scope.errorDetails.length == 0) {
                    scope.isCollapsed = true;
                    scope.hideTable = false;
                    scope.hidePentahoReport = true;
                    scope.hideChart = true;
                    var pagePayload = buildReportPayload({
                        limit: scope.recordsPerPage,
                        offset: ((pageNumber - 1) * scope.recordsPerPage)
                    });
                    resourceFactory.runReportsResource.getReport(pagePayload, function (data) {
                        scope.reportData.data = data.data;
                        scope.totalRecords = data.count;
                    });
                }
            }
            scope.runReport = function () {
                //clear the previous errors
                scope.errorDetails = [];
                removeErrors();

                //update date fields with proper dateformat
                normalizeDateParams();

                //Custom validation for report parameters
                parameterValidationErrors();

                if (scope.errorDetails.length == 0) {
                    scope.isCollapsed = true;
                    switch (scope.reportType) {
                        case "Table":
                        case "SMS":
                            scope.hideTable = false;
                            scope.hidePentahoReport = true;
                            scope.hideChart = true;
                            var tablePayload = buildReportPayload({limit: scope.recordsPerPage, offset: 0});
                            resourceFactory.runReportsResource.getReport(tablePayload, function (data) {
                                scope.reportData.columnHeaders = data.columnHeaders;
                                scope.reportData.data = data.data;
                                scope.totalRecords = data.count;
                            });
                            break;

                        case "Pentaho":
                            scope.hideTable = true;
                            scope.hidePentahoReport = false;
                            scope.hideChart = true;

                            var reportURL = $rootScope.hostUrl + API_VERSION + "/runreports/" + encodeURIComponent(scope.reportName);
                            reportURL += "?output-type=" + encodeURIComponent(scope.formData.outputType) + "&tenantIdentifier=" + $rootScope.tenantIdentifier + "&locale=" + scope.optlang.code + "&dateFormat=" + scope.df;

                            var inQueryParameters = buildReportParms();
                            if (inQueryParameters > "") reportURL += "&" + inQueryParameters;

                            // Allow untrusted urls for the ajax request.
                            // http://docs.angularjs.org/error/$sce/insecurl
                            reportURL = $sce.trustAsResourceUrl(reportURL);
                            reportURL = $sce.valueOf(reportURL);
                            http.get(reportURL, {responseType: 'arraybuffer'})
                                .then(function(response) {
                                    let data = response.data;
                                    let status = response.status;
                                    let headers = response.headers;
                                    let config = response.config;
                                    var contentType = headers('Content-Type');
                                    var file = new Blob([data], {type: contentType});
                                    var fileContent = URL.createObjectURL(file);

                                    // Pass the form data to the iframe as a data url.
                                    scope.baseURL = $sce.trustAsResourceUrl(fileContent);
                              })
                            .catch(function(error){
                                $log.error(`Error loading ${scope.reportType} report`);
                                $log.error(error);
                            });
                            break;
                        case "Chart":
                            scope.hideTable = true;
                            scope.hidePentahoReport = true;
                            scope.hideChart = false;
                            resourceFactory.runReportsResource.getReport(buildReportPayload(), function (data) {
                                scope.reportData.columnHeaders = data.columnHeaders;
                                scope.reportData.data = data.data;
                                scope.chartData = [];
                                scope.barData = [];
                                var l = data.data.length;
                                for (var i = 0; i < l; i++) {
                                    scope.chartData.push({
                                        key: data.data[i].row[0],
                                        values: data.data[i].row[1]
                                    });
                                }
                                var x = {};
                                x.key = "summary";
                                x.values = [];
                                for (var m = 0; m < l; m++) {
                                    var inner = [data.data[m].row[0], data.data[m].row[1]];
                                    x.values.push(inner);
                                }
                                scope.barData.push(x);
                            });
                            break;
                        default:
                            var errorObj = new Object();
                            errorObj.field = scope.reportType;
                            errorObj.code = 'error.message.report.type.is.invalid';
                            errorObj.args = {params: []};
                            errorObj.args.params.push({value: scope.reportType});
                            scope.errorDetails.push(errorObj);
                            break;
                    }
                }
            };
        }
    });
    mifosX.ng.application.controller('RunReportsController', ['$scope', '$routeParams', 'ResourceFactory', '$location', 'dateFilter', '$http', 'API_VERSION', '$rootScope', '$sce', '$log', mifosX.controllers.RunReportsController]).run(function ($log) {
        $log.info("RunReportsController initialized");
    });
}(mifosX.controllers || {}));
