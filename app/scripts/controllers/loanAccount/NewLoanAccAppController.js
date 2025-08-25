(function (module) {
    mifosX.controllers = _.extend(module, {
        NewLoanAccAppController: function (scope, routeParams, resourceFactory, location, dateFilter, uiConfigService, WizardHandler, translate) {
            scope.previewRepayment = false;
            scope.clientId = routeParams.clientId;
            scope.groupId = routeParams.groupId;
            scope.restrictDate = new Date();
            scope.formData = {};
            scope.topUpCarryForward = {};
            scope.carryForwardLoanTerm = 0;
            scope.loandetails = {};
            scope.chargeFormData = {}; //For charges
            scope.collateralFormData = {}; //For collaterals
            scope.inparams = {resourceType: 'template', activeOnly: 'true'};
            scope.date = {};
            scope.formDat = {};
            scope.datatables = [];
            scope.noOfTabs = 1;
            scope.step = '-';
            scope.formData.datatables = [];
            scope.formDat.datatables = [];
            scope.tf = "HH:mm";
            scope.loanApp = "LoanApp";
            scope.customSteps = [];
            scope.tempDataTables = [];
            scope.disabled = true;
            scope.translate= translate;
            scope.rateFlag=false;
            scope.interestRateChart = {};
            scope.collateralAddedDataArray = [];
            scope.collateralsData = {};
            scope.addedCollateral = {};
            scope.toVendorClients = []
            scope.toVendorAccounts = [];
            scope.vendorSavingsAccountOptions = [];

            scope.date.first = new Date();
            scope.date.applicationDate = new Date();  // NEW

            if (scope.clientId) {
                scope.inparams.clientId = scope.clientId;
                scope.formData.clientId = scope.clientId;
            }


            if (scope.groupId) {
                scope.inparams.groupId = scope.groupId;
                scope.formData.groupId = scope.groupId;
            }

            if (scope.clientId && scope.groupId) {
                scope.inparams.templateType = 'jlg';
            }
            else if (scope.groupId) {
                scope.inparams.templateType = 'group';
            }
            else if (scope.clientId) {
                scope.inparams.templateType = 'individual';
            }

            scope.inparams.staffInSelectedOfficeOnly = true;
            scope.inparams.vendorClientId = '';
            scope.currencyType;

            resourceFactory.loanResource.get(scope.inparams, function (data) {
                scope.products = data.productOptions;

                scope.ratesEnabled = data.isRatesEnabled;

                if (data.clientName) {
                    scope.clientName = data.clientName;
                }
                if (data.group) {
                    scope.groupName = data.group.name;
                }
            });

            scope.loanProductChange = function (loanProductId) {
                scope.inparams.productId = loanProductId;
                resourceFactory.clientcollateralTemplateResource.getAllCollaterals({clientId: scope.clientId, prodId: loanProductId}, function(data) {
                        scope.collateralsData = data;
                        scope.collateralsData = scope.collateralsData.filter((collateral) => collateral.quantity != 0);
                });
                // scope.datatables = [];
                resourceFactory.loanResource.get(scope.inparams, function (data) {
                    scope.loanaccountinfo = data;
                    scope.previewClientLoanAccInfo();
                    scope.loandetails.interestValue = scope.loanaccountinfo.interestType.value;
                    scope.loandetails.amortizationValue = scope.loanaccountinfo.amortizationType.value;
                    scope.loandetails.interestCalculationPeriodValue = scope.loanaccountinfo.interestCalculationPeriodType.value;
                    scope.loandetails.transactionProcessingStrategyValue = scope.formValue(scope.loanaccountinfo.transactionProcessingStrategyOptions,scope.formData.transactionProcessingStrategyId,'id','name');
                    scope.datatables = data.datatables;
                    scope.handleDatatables(scope.datatables);
                    scope.disabled = false;
                });

                resourceFactory.loanResource.get({resourceType: 'template', templateType: 'collateral', productId: loanProductId, fields: 'id,loanCollateralOptions'}, function (data) {
                    scope.collateralOptions = data.loanCollateralOptions || [];
                });
            }

            scope.goNext = function(form){
                WizardHandler.wizard().checkValid(form);
            }

            scope.handleDatatables = function (datatables) {
                if (!_.isUndefined(datatables) && datatables.length > 0) {
                    scope.formData.datatables = [];
                    scope.formDat.datatables = [];
                    scope.noOfTabs = datatables.length + 1;
                    angular.forEach(datatables, function (datatable, index) {
                        scope.updateColumnHeaders(datatable.columnHeaderData);
                        angular.forEach(datatable.columnHeaderData, function (colHeader, i) {
                            if (_.isEmpty(scope.formDat.datatables[index])) {
                                scope.formDat.datatables[index] = {data: {}};
                            }

                            if (_.isEmpty(scope.formData.datatables[index])) {
                                scope.formData.datatables[index] = {
                                    registeredTableName: datatable.registeredTableName,
                                    data: {locale: scope.optlang.code}
                                };
                            }

                            if (datatable.columnHeaderData[i].columnDisplayType == 'DATETIME') {
                                scope.formDat.datatables[index].data[datatable.columnHeaderData[i].columnName] = {};
                            }
                        });
                    });
                }
            };

            scope.updateColumnHeaders = function(columnHeaderData) {
                var colName = columnHeaderData[0].columnName;
                if (colName == 'id') {
                    columnHeaderData.splice(0, 1);
                }

                colName = columnHeaderData[0].columnName;
                if (colName == 'client_id' || colName == 'office_id' || colName == 'group_id' || colName == 'center_id' || colName == 'loan_id' || colName == 'savings_account_id') {
                    columnHeaderData.splice(0, 1);
                }
            };
            //Wizard is creating new scope on every step. So resetting the variable here
            scope.resetPreviewFlag = function() {
                scope.previewRepayment =  !scope.previewRepayment;
            };

            scope.previewClientLoanAccInfo = function () {
                scope.previewRepayment = false;
                scope.charges = scope.loanaccountinfo.charges || [];
                scope.formData.disbursementData = scope.loanaccountinfo.disbursementDetails || [];
                scope.collaterals = [];

                if (scope.loanaccountinfo.calendarOptions) {
                    scope.formData.syncRepaymentsWithMeeting = true;
                    scope.formData.syncDisbursementWithMeeting = true;
                }

                scope.multiDisburseLoan = scope.loanaccountinfo.multiDisburseLoan;
                scope.formData.productId = scope.loanaccountinfo.loanProductId;
                scope.loanProductName = scope.loanaccountinfo.loanProductName;
                scope.formData.fundId = scope.loanaccountinfo.fundId;
                scope.formData.principal = scope.loanaccountinfo.principal;
                scope.formData.loanTermFrequency = scope.loanaccountinfo.termFrequency;
                scope.formData.loanTermFrequencyType = scope.loanaccountinfo.termPeriodFrequencyType.id;
                scope.loandetails.loanTermFrequencyValue = scope.loanaccountinfo.termPeriodFrequencyType.value;
                scope.formData.numberOfRepayments = scope.loanaccountinfo.numberOfRepayments;
                scope.formData.repaymentEvery = scope.loanaccountinfo.repaymentEvery;
                scope.formData.repaymentFrequencyType = scope.loanaccountinfo.repaymentFrequencyType.id;
                scope.loandetails.repaymentFrequencyValue = scope.loanaccountinfo.repaymentFrequencyType.value;
                scope.formData.interestRatePerPeriod = scope.loanaccountinfo.interestRatePerPeriod;
                scope.formData.amortizationType = scope.loanaccountinfo.amortizationType.id;
                scope.formData.fixedPrincipalPercentagePerInstallment = scope.loanaccountinfo.fixedPrincipalPercentagePerInstallment;
                scope.formData.isEqualAmortization = scope.loanaccountinfo.isEqualAmortization;
                scope.loandetails.amortizationValue = scope.loanaccountinfo.amortizationType.value;
                scope.formData.interestType = scope.loanaccountinfo.interestType.id;
                scope.loandetails.interestValue = scope.loanaccountinfo.interestType.value;
                scope.formData.interestCalculationPeriodType = scope.loanaccountinfo.interestCalculationPeriodType.id;
                scope.loandetails.interestCalculationPeriodValue = scope.loanaccountinfo.interestCalculationPeriodType.value;
                scope.formData.allowPartialPeriodInterestCalcualtion = scope.loanaccountinfo.allowPartialPeriodInterestCalcualtion;
                scope.formData.inArrearsTolerance = scope.loanaccountinfo.inArrearsTolerance;
                scope.formData.graceOnPrincipalPayment = scope.loanaccountinfo.graceOnPrincipalPayment;
                scope.formData.graceOnInterestPayment = scope.loanaccountinfo.graceOnInterestPayment;
                scope.formData.graceOnArrearsAgeing = scope.loanaccountinfo.graceOnArrearsAgeing;
                scope.formData.transactionProcessingStrategyId = scope.loanaccountinfo.transactionProcessingStrategyId;
                scope.loandetails.transactionProcessingStrategyValue = scope.formValue(scope.loanaccountinfo.transactionProcessingStrategyOptions,scope.formData.transactionProcessingStrategyId,'id','name');
                scope.formData.graceOnInterestCharged = scope.loanaccountinfo.graceOnInterestCharged;
                scope.formData.fixedEmiAmount = scope.loanaccountinfo.fixedEmiAmount;
                scope.formData.maxOutstandingLoanBalance = scope.loanaccountinfo.maxOutstandingLoanBalance;

                if (scope.loanaccountinfo.isInterestRecalculationEnabled && scope.loanaccountinfo.interestRecalculationData.recalculationRestFrequencyDate) {
                    scope.date.recalculationRestFrequencyDate = new Date(scope.loanaccountinfo.interestRecalculationData.recalculationRestFrequencyDate);
                }
                if (scope.loanaccountinfo.isInterestRecalculationEnabled && scope.loanaccountinfo.interestRecalculationData.recalculationCompoundingFrequencyDate) {
                    scope.date.recalculationCompoundingFrequencyDate = new Date(scope.loanaccountinfo.interestRecalculationData.recalculationCompoundingFrequencyDate);
                }

                if(scope.loanaccountinfo.isLoanProductLinkedToFloatingRate) {
                    scope.formData.isFloatingInterestRate = false ;
                }

                scope.loandetails = angular.copy(scope.formData);
                scope.loandetails.productName = scope.formValue(scope.products,scope.formData.productId,'id','name');
                scope.formData.rates = scope.loanaccountinfo.product.rates;
                if (scope.formData.rates && scope.formData.rates.length>0){
                    scope.rateFlag=true;
                }
                scope.rateOptions = [];
                if(scope.loanaccountinfo.jlgInterestChartRateSummaryData != null && scope.loanaccountinfo.jlgInterestChartRateSummaryData !== undefined){
                scope.interestRateChart = scope.loanaccountinfo.jlgInterestChartRateSummaryData;
                }
                scope.formData.isBnplLoan = scope.loanaccountinfo.isBnplLoan;
                scope.formData.equityContributionLoanPercentage = scope.loanaccountinfo.equityContributionLoanPercentage;
                scope.formData.requiresEquityContribution = scope.loanaccountinfo.requiresEquityContribution;
                scope.toVendorClients = scope.loanaccountinfo.vendorClientOptions;
            };

          //Rate
          scope.rateSelected = function(currentRate){

            if(currentRate && !scope.checkIfRateAlreadyExist(currentRate)){
                scope.rateFlag=true;
              scope.formData.rates.push(currentRate);
              scope.rateOptions.splice(scope.rateOptions.indexOf(currentRate),1);
              scope.currentRate = '';
              currentRate = '';
              scope.calculateRates();
            }
          };

          scope.checkIfRateAlreadyExist = function(currentRate){
            var exist = false;
            scope.formData.rates.forEach(function(rate){
              if(rate.id === currentRate.id){
                exist = true;
              }
            });

            return exist
          };

          scope.calculateRates = function(){
            var total = 0;
            scope.formData.rates.forEach(function(rate){
              total += rate.percentage;
            });
            if (total===0){
                total=undefined;
                scope.rateFlag=false;
            }
            scope.formData.interestRatePerPeriod = total;


          };

          scope.deleteRate = function (index){
            scope.rateOptions.push(scope.formData.rates[index]);
            scope.formData.rates.splice(index,1);
            scope.calculateRates();
          };

          scope.bnplValueChanged = () => {
              scope.formData.requiresEquityContribution = scope.loanaccountinfo.requiresEquityContribution;
              scope.formData.equityContributionLoanPercentage = scope.loanaccountinfo.equityContributionLoanPercentage;
          };

          scope.changeVendorClient = function (client) {
              scope.inparams.vendorClientId = client.id;
              resourceFactory.loanResource.get(scope.inparams, function (data) {
                  scope.vendorSavingsAccountOptions = data.vendorSavingsAccountOptions;
              });
          };

          scope.$watch('formData',function(newVal){
                scope.loandetails = angular.extend(scope.loandetails,newVal);
            },true);

            scope.formValue = function(array,model,findattr,retAttr){
                findattr = findattr ? findattr : 'id';
                retAttr = retAttr ? retAttr : 'value';
                console.log(findattr,retAttr,model);
                return _.find(array, function (obj) {
                    return obj[findattr] === model;
                })[retAttr];
            };
            scope.$watch("date.second", function(newValue, oldValue) {
            scope.computeInterestRateForJlg();
            });
            scope.addCharge = function () {
                if (scope.chargeFormData.chargeId) {
                    resourceFactory.chargeResource.get({chargeId: this.chargeFormData.chargeId, template: 'true'}, function (data) {
                        data.chargeId = data.id;
                        scope.charges.push(data);
                        scope.chargeFormData.chargeId = undefined;
                    });
                }
            }

            scope.deleteCharge = function (index) {
                scope.charges.splice(index, 1);
            }


            scope.addTranches = function () {
                scope.formData.disbursementData.push({
                });
            };
            scope.deleteTranches = function (index) {
                scope.formData.disbursementData.splice(index, 1);
            }

            scope.syncRepaymentsWithMeetingchange = function () {
                if (!scope.formData.syncRepaymentsWithMeeting) {
                    scope.formData.syncDisbursementWithMeeting = false;
                }
            };
            scope.computeInterestRateForJlg = function() {
                  //Reset interest to default
                  scope.formData.interestRatePerPeriod = scope.loanaccountinfo != null ? scope.loanaccountinfo.interestRatePerPeriod : '';
                  if(scope.formData.loanTermFrequency == 1 && scope.formData.loanTermFrequencyType == 1){
                   var disbursementDate = dateFilter(scope.date.second, scope.df);
                   var nextMeetingDate  = dateFilter(new Date(scope.loanaccountinfo.calendarOptions[0].nextTenRecurringDates[0]),scope.df);
                   var loanTermFrequency = scope.formData.loanTermFrequency;
                   var loanTermFrequencyType = scope.formData.loanTermFrequencyType;
                   var diffInDisbursementAndMeetingDates = scope.diffDate(disbursementDate,nextMeetingDate);

            angular.forEach(scope.loanaccountinfo.jlgInterestChartRateSummaryData, function(value, key) {
                  if(diffInDisbursementAndMeetingDates == value.dayOfWeek){
                       scope.formData.interestRatePerPeriod = value.interestRate;
                   }
                   })

                  }
                 };

            scope.diffDate = function(disbursementDate,nextMeetingDate){
                 var msPerDay = 8.64e7;

                   var x0 = new Date(disbursementDate);
                   var x1 = new Date(nextMeetingDate);

                   x0.setHours(12,0,0);
                   x1.setHours(12,0,0);

                   return Math.round( (x1 - x0) / msPerDay );
                  };

            scope.syncDisbursementWithMeetingchange = function () {
                if (scope.formData.syncDisbursementWithMeeting) {
                    scope.formData.syncRepaymentsWithMeeting = true;
                }
            };

            scope.addCollateral = function () {
                if (scope.collateralFormData.collateralId == undefined || scope.collateralFormData.collateralId == null) {
                    scope.collateralRequired = true;
                    return;
                }
                if (scope.collateralFormData.quantity == undefined || scope.collateralFormData.quantity == null) {
                    scope.qtyRequired = true;
                    return;
                }
                scope.collateralRequired = false;
                scope.qtyRequired = false;
                scope.collateralAddedDataArray.push(scope.collateralsData.filter((collateral) => scope.collateralFormData.collateralId == collateral.collateralId)[0]);
                scope.collateralsData = scope.collateralsData.filter((collateral) => scope.collateralFormData.collateralId != collateral.collateralId);
                scope.collaterals.push({collateralId: scope.collateralFormData.collateralId, quantity: scope.collateralFormData.quantity, total: scope.collateralFormData.total, totalCollateral: scope.collateralFormData.totalCollateral});
                scope.collateralFormData.quantity = undefined;
                scope.collateralFormData.total = undefined;
                scope.collateralFormData.totalCollateral = undefined;
            };

            scope.updateValues = function() {
                scope.collateralObject = scope.collateralsData.filter((collateral) => collateral.collateralId == scope.collateralFormData.collateralId)[0];
                if (scope.collateralObject != undefined) {
                    scope.collateralFormData.total = scope.collateralFormData.quantity * scope.collateralObject.basePrice;
                    scope.collateralFormData.totalCollateral = scope.collateralFormData.total * scope.collateralObject.pctToBase / 100.0;
                }
            }

            scope.deleteCollateral = function (index) {
                scope.collateralId = scope.collaterals[index].collateralId;
                scope.collateralObject = scope.collateralAddedDataArray.filter((collateral) => collateral.collateralId == scope.collateralId)[0];
                scope.collateralsData.push(scope.collateralObject);
                scope.collaterals.splice(index, 1);
            };

            scope.previewRepayments = function () {
                scope.calculateTopUpCarryForwardSchedules();
                // Make sure charges and collaterals are empty before initializing.
                delete scope.formData.charges;
                delete scope.formData.collateral;
                if(_.isUndefined(scope.formData.datatables) || (!_.isUndefined(scope.formData.datatables) && scope.formData.datatables.length == 0)) {
                    delete scope.formData.datatables;
                }

                var reqFirstDate = dateFilter(scope.date.first, scope.df);
                var reqSecondDate = dateFilter(scope.date.second, scope.df);
                var reqThirdDate = dateFilter(scope.date.third, scope.df);
                var reqFourthDate = dateFilter(scope.date.fourth, scope.df);
                if (scope.charges.length > 0) {
                    scope.formData.charges = [];
                    for (var i in scope.charges) {
                        scope.formData.charges.push({ chargeId: scope.charges[i].chargeId, amount: scope.charges[i].amount, dueDate: dateFilter(scope.charges[i].dueDate, scope.df) });
                    }
                }

                if (scope.formData.disbursementData.length > 0) {
                    for (var i in scope.formData.disbursementData) {
                        scope.formData.disbursementData[i].expectedDisbursementDate = dateFilter(scope.formData.disbursementData[i].expectedDisbursementDate, scope.df);
                    }
                }

                if (scope.collaterals.length > 0) {
                    scope.formData.collateral = [];
                    for (var i in scope.collaterals) {
                        scope.formData.collateral.push({clientCollateralId: scope.collaterals[i].collateralId, quantity: scope.collaterals[i].quantity});
                    }
                    ;
                }

                if (this.formData.syncRepaymentsWithMeeting) {
                    this.formData.calendarId = scope.loanaccountinfo.calendarOptions[0].id;
                    scope.syncRepaymentsWithMeeting = this.formData.syncRepaymentsWithMeeting;
                }
                delete this.formData.syncRepaymentsWithMeeting;

                this.formData.interestChargedFromDate = reqThirdDate;
                this.formData.repaymentsStartingFromDate = reqFourthDate;
                this.formData.locale = scope.optlang.code;
                this.formData.dateFormat = scope.df;
                this.formData.loanType = scope.inparams.templateType;
                this.formData.expectedDisbursementDate = reqSecondDate;
                this.formData.submittedOnDate = reqFirstDate;
                if(scope.carryForwardLoanTerm > 0){
                this.formData.loanTermIncludesToppedUpLoanTerm = scope.loanaccountinfo.product.loanTermIncludesToppedUpLoanTerm;
                }
                if(this.formData.interestCalculationPeriodType == 0){
                    this.formData.allowPartialPeriodInterestCalcualtion = false;
                }
                resourceFactory.loanResource.save({command: 'calculateLoanSchedule'}, this.formData, function (data) {
                    scope.repaymentscheduleinfo = data;
                    scope.previewRepayment = true;
                    scope.formData.syncRepaymentsWithMeeting = scope.syncRepaymentsWithMeeting;
                });

            }

            scope.hidePreviewRepayments = function() {
                scope.previewRepayment = false;
            }


            uiConfigService.appendConfigToScope(scope);

            //return input type
            scope.fieldType = function (type) {
                var fieldType = "";
                if (type) {
                    if (type == 'CODELOOKUP' || type == 'CODEVALUE') {
                        fieldType = 'SELECT';
                    } else if (type == 'DATE') {
                        fieldType = 'DATE';
                    } else if (type == 'DATETIME') {
                        fieldType = 'DATETIME';
                    } else if (type == 'BOOLEAN') {
                        fieldType = 'BOOLEAN';
                    } else {
                        fieldType = 'TEXT';
                    }
                }
                return fieldType;
            };

            scope.submit = function () {
                // if (WizardHandler.wizard().getCurrentStep() != scope.noOfTabs) {
                //     WizardHandler.wizard().next();
                //     return;
                // }
                // Make sure charges and collaterals are empty before initializing.
                delete scope.formData.charges;
                delete scope.formData.collateral;
                var reqFirstDate = dateFilter(scope.date.first, scope.df);
                var reqSecondDate = dateFilter(scope.date.second, scope.df);
                var reqThirdDate = dateFilter(scope.date.third, scope.df);
                var reqFourthDate = dateFilter(scope.date.fourth, scope.df);
                var reqFifthDate = dateFilter(scope.date.fifth, scope.df);

                if (scope.charges.length > 0) {
                    scope.formData.charges = [];
                    for (var i in scope.charges) {
                        scope.formData.charges.push({ chargeId: scope.charges[i].chargeId, amount: scope.charges[i].amount, dueDate: dateFilter(scope.charges[i].dueDate, scope.df) });
                    }
                }

                if (scope.formData.disbursementData.length > 0) {
                    for (var i in scope.formData.disbursementData) {
                        scope.formData.disbursementData[i].expectedDisbursementDate = dateFilter(scope.formData.disbursementData[i].expectedDisbursementDate, scope.df);
                    }
                }
                if (scope.collaterals.length > 0) {
                    scope.formData.collateral = [];
                    for (var i in scope.collaterals) {
                        scope.formData.collateral.push({clientCollateralId: scope.collaterals[i].collateralId, quantity: scope.collaterals[i].quantity * 1.0});
                    }
                }

                if (this.formData.syncRepaymentsWithMeeting) {
                    this.formData.calendarId = scope.loanaccountinfo.calendarOptions[0].id;
                }


                if(scope.carryForwardLoanTerm > 0){
                this.formData.loanTermIncludesToppedUpLoanTerm = scope.loanaccountinfo.product.loanTermIncludesToppedUpLoanTerm;
                }
                delete this.formData.syncRepaymentsWithMeeting;
                this.formData.interestChargedFromDate = reqThirdDate;
                this.formData.repaymentsStartingFromDate = reqFourthDate;
                this.formData.locale = scope.optlang.code;
                this.formData.dateFormat = scope.df;
                this.formData.loanType = scope.inparams.templateType;
                this.formData.expectedDisbursementDate = reqSecondDate;
                this.formData.submittedOnDate = reqFirstDate;
                this.formData.applicationDate = dateFilter(scope.date.applicationDate, scope.df);
                this.formData.createStandingInstructionAtDisbursement = scope.formData.createStandingInstructionAtDisbursement;
                if (scope.date.recalculationRestFrequencyDate) {
                    var restFrequencyDate = dateFilter(scope.date.recalculationRestFrequencyDate, scope.df);
                    scope.formData.recalculationRestFrequencyDate = restFrequencyDate;
                }
                if (scope.date.recalculationCompoundingFrequencyDate) {
                    var restFrequencyDate = dateFilter(scope.date.recalculationCompoundingFrequencyDate, scope.df);
                    scope.formData.recalculationCompoundingFrequencyDate = restFrequencyDate;
                }
                if(this.formData.interestCalculationPeriodType == 0){
                    this.formData.allowPartialPeriodInterestCalcualtion = false;
                }
                if (!_.isUndefined(scope.datatables) && scope.datatables.length > 0) {
                    angular.forEach(scope.datatables, function (datatable, index) {
                        scope.columnHeaders = datatable.columnHeaderData;
                        angular.forEach(scope.columnHeaders, function (colHeader, i) {
                            scope.dateFormat = scope.df + " " + scope.tf
                            if (scope.columnHeaders[i].columnDisplayType == 'DATE') {
                                if (!_.isUndefined(scope.formDat.datatables[index].data[scope.columnHeaders[i].columnName])) {
                                    scope.formData.datatables[index].data[scope.columnHeaders[i].columnName] = dateFilter(scope.formDat.datatables[index].data[scope.columnHeaders[i].columnName],
                                        scope.dateFormat);
                                    scope.formData.datatables[index].data.dateFormat = scope.dateFormat;
                                }
                            } else if (scope.columnHeaders[i].columnDisplayType == 'DATETIME') {
                                if (!_.isUndefined(scope.formDat.datatables[index].data[scope.columnHeaders[i].columnName].date) && !_.isUndefined(scope.formDat.datatables[index].data[scope.columnHeaders[i].columnName].time)) {
                                    scope.formData.datatables[index].data[scope.columnHeaders[i].columnName] = dateFilter(scope.formDat.datatables[index].data[scope.columnHeaders[i].columnName].date, scope.df)
                                        + " " + dateFilter(scope.formDat.datatables[index].data[scope.columnHeaders[i].columnName].time, scope.tf);
                                    scope.formData.datatables[index].data.dateFormat = scope.dateFormat;
                                }
                            }
                        });
                    });
                } else {
                    delete scope.formData.datatables;
                }
                if (!this.formData.loanWithAnotherInstitution) {
                    this.formData.loanWithAnotherInstitution = false;
                    delete this.formData.loanWithAnotherInstitutionAmount;
                }
                resourceFactory.loanResource.save(this.formData, function (data) {
                    scope.carryForwardLoanTerm = 0;
                    location.path('/viewloanaccount/' + data.loanId);
                });
            };

            scope.calculateTopUpCarryForwardSchedules = function () {
                scope.carryForwardLoanTerm = 0;
                scope.topUpCarryForward.loanIdToClose = this.formData.loanIdToClose;
                scope.topUpCarryForward.isTopup = this.formData.isTopup;
                scope.topUpCarryForward.loanTermIncludesToppedUpLoanTerm = scope.loanaccountinfo.product.loanTermIncludesToppedUpLoanTerm;

                if(scope.topUpCarryForward.loanIdToClose != null && scope.topUpCarryForward.isTopup != null && scope.topUpCarryForward.loanTermIncludesToppedUpLoanTerm){
                resourceFactory.loanResource.save({command: 'calculateTopUpCarryForwardSchedules'}, scope.topUpCarryForward, function (data) {
                    scope.carryForwardLoanTerm = data.carryForwardLoanTerm;
                    scope.formData.numberOfRepaymentsToCarryForward = scope.carryForwardLoanTerm;
                    scope.formData.loanTermToTopUp = scope.carryForwardLoanTerm;
                });
                  }
                        }

            scope.cancel = function () {
                if (scope.groupId) {
                    location.path('/viewgroup/' + scope.groupId);
                } else if (scope.clientId) {
                    location.path('/viewclient/' + scope.clientId);
                }
            }
        }
    });
    mifosX.ng.application.controller('NewLoanAccAppController', ['$scope', '$routeParams', 'ResourceFactory', '$location', 'dateFilter', 'UIConfigService', 'WizardHandler', '$translate',mifosX.controllers.NewLoanAccAppController]).run(function ($log) {
        $log.info("NewLoanAccAppController initialized");
    });
}(mifosX.controllers || {}));
