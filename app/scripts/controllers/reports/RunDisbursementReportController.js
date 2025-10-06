(function (module) {
    mifosX.controllers = _.extend(module, {

        RunDisbursementReportController: function (
            $scope, $routeParams, ResourceFactory, $location, dateFilter,
            $http, API_VERSION, $rootScope, $sce, $log
        ) {
            $scope.formData = {};
            $scope.baseURL = "";
            $scope.reportGenerated = false;
            $scope.isViewMode = false;
            $scope.loanProducts = [];

            if ($routeParams.reportId) {

                $scope.isViewMode = true;

                ResourceFactory.disbursementReportsViewResource.view(
                    { id: $routeParams.reportId },
                    {},
                    function (data) {
                        $scope.reportName = data.reportName;
                        $scope.fileFormat = data.fileFormat;
                        
                        if (data.parameters) {
                            try {
                                const params = JSON.parse(data.parameters);
                                $scope.startDate = new Date(params.start_date);
                                $scope.endDate = new Date(params.end_date);
                                $scope.loanProductIds = params.product_ids ? params.product_ids.split(',').map(Number) : [];
                                $scope.officeId = params.location_id || null;
                                $scope.interestPercentage = params.interest_percentage || 0;
                            } catch (e) {
                                console.error("Error parsing parameters", e);
                            }
                        }

                        $scope.runReport();

                        $log.info("Viewing report", data);
                        $scope.reportGenerated = false;
                    }
                );
            } else {
                $scope.reportGenerated = false;
            }


            // Load offices
            ResourceFactory.officeResource.getAllOffices({}, function (data) {
                $scope.offices = data;
            });

            // Load loan products
            ResourceFactory.loanProductResource.getAllLoanProducts({}, function (data) {
                $scope.loanProducts = data;
            });

            // Run the report
            $scope.runReport = function () {
                let selectedOffice = null;
                if ($scope.officeId) {
                    selectedOffice = $scope.offices.find(o => o.id === $scope.officeId);
                }
                const queryParams = {
                    start_date: dateFilter($scope.startDate, 'yyyy-MM-dd'),
                    end_date: dateFilter($scope.endDate, 'yyyy-MM-dd'),
                    product_ids: $scope.loanProductIds.join(","),
                    location_name: selectedOffice ? selectedOffice.name : 'All',
                    location_id: $scope.officeId || null,
                    interest_percentage: $scope.interestPercentage || 10
                };

                // Map format to HTTP Accept header
                const acceptMap = {
                    PDF: "application/pdf",
                    EXCEL: "application/vnd.ms-excel",
                };
                const acceptHeader = acceptMap[$scope.fileFormat] || "application/pdf";

                $http({
                    method: 'GET',
                    url: $rootScope.hostUrl + API_VERSION + "/reports/jasper/disbursement_report",
                    params: queryParams,
                    responseType: 'blob',
                    headers: {
                        'Accept': acceptHeader
                    }
                }).then(function (response) {
                    const blob = new Blob([response.data], { type: acceptHeader });
                    const url = URL.createObjectURL(blob);
                    $scope.baseURL = $sce.trustAsResourceUrl(url);
                    $scope.reportGenerated = true;
                }).catch(function (err) {
                    $log.error("Error fetching report:", err);
                    $scope.reportGenerated = false;
                });
            };

            $scope.saveRequest = function () {
                let selectedOffice = null;
                if ($scope.officeId) {
                    selectedOffice = $scope.offices.find(o => o.id === $scope.officeId);
                }
                const paramters = {
                    fileFormat: $scope.fileFormat,
                    start_date: dateFilter($scope.startDate, 'yyyy-MM-dd'),
                    end_date: dateFilter($scope.endDate, 'yyyy-MM-dd'),
                    product_ids: $scope.loanProductIds.join(","),
                    location_name: selectedOffice ? selectedOffice.name : 'All',
                    location_id: $scope.officeId || null,
                    interest_percentage: $scope.interestPercentage || 10
                };

                const payload = {
                    report_name: $scope.reportName,
                    file_format: $scope.fileFormat,
                    'status': 'PENDING',
                    parameters: paramters
                }

                ResourceFactory.disbursementReportsResource.create(
                    payload,
                    function () {
                        $log.info("Report request saved successfully");
                        $location.path('/disbursement-reports');
                    },
                    function (err) {
                        $log.error("Error saving report request:", err);
                    }
                );
            };

            // Cancel action
            $scope.cancel = function () {
                $location.path('/disbursement-reports');
            };
        }
    });

    mifosX.ng.application.controller(
        'RunDisbursementReportController',
        [
            '$scope',
            '$routeParams',
            'ResourceFactory',
            '$location',
            'dateFilter',
            '$http',
            'API_VERSION',
            '$rootScope',
            '$sce',
            '$log',
            mifosX.controllers.RunDisbursementReportController
        ]
    ).run(function ($log) {
        $log.info("RunDisbursementReportController initialized");
    });
}(mifosX.controllers || {}));
