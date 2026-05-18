(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewLoanDetailsController: function (scope, routeParams, resourceFactory,paginatorService, location, route, http, $uibModal, dateFilter, API_VERSION, $sce, $rootScope, $window, interval, webStorage, localStorageService) {
            scope.loandocuments = [];
            scope.report = false;
            scope.hidePentahoReport = true;
            scope.formData = {};
            scope.date = {};
            scope.date.payDate = new Date();
            scope.hideAccrualTransactions = false;
            scope.isHideAccrualsCheckboxChecked = true;
            scope.loandetails = [];
            scope.isPendingDisbursement = false;
            scope.projectionSize = 0;
            scope.totalIncome = [];
            scope.totalExpense = [];
            scope.cashFlowData = { cashFlowDataList: [] };
            scope.financialRatioData = {};
            scope.latestClosureDate = null;
            scope.recoveryReversalTransactionsByOriginalId = {};
            scope.instructions = { currentPageItems: [] };
            scope.cblpstatusactive = false;
            scope.cbIsCreditCheckMandatory = false;
            scope.cblpstatuses = null;
            scope.crbReportTransUnion = null;
            scope.crbReportMetrolpolIdentityVerification = null;


            scope.interval = interval(function () {
                if(scope.isPendingDisbursement){
                    fetchLoanAccountDetails();
                } else {
                    interval.cancel(scope.interval);
                }
            }, 10000);

            scope.$on('$destroy', function () {
                interval.cancel(scope.interval);
            });

            function normalizeDate(value) {
                if (!value) {
                    return null;
                }

                if (angular.isDate(value)) {
                    return value;
                }

                if (angular.isArray(value) && value.length >= 3) {
                    return new Date(value[0], value[1] - 1, value[2]);
                }

                if (typeof value === 'string') {
                    var dateParts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (dateParts) {
                        return new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]));
                    }
                }

                var parsedDate = new Date(value);
                if (isNaN(parsedDate.getTime())) {
                    return null;
                }

                return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
            }

            function extractTransactionId(transactionRef) {
                if (!transactionRef) {
                    return null;
                }

                if (angular.isObject(transactionRef)) {
                    return transactionRef.id || transactionRef.transactionId || transactionRef.resourceId || null;
                }

                return transactionRef;
            }

            function extractTransactionDate(transactionRef) {
                if (!angular.isObject(transactionRef)) {
                    return null;
                }

                var dateFieldName = transactionRef.date ? 'date'
                    : (transactionRef.transactionDate ? 'transactionDate'
                        : (transactionRef.submittedOnDate ? 'submittedOnDate' : null));
                if (!dateFieldName) {
                    return null;
                }

                var normalizedDate = normalizeDate(transactionRef[dateFieldName]);
                if (normalizedDate) {
                    transactionRef[dateFieldName] = normalizedDate;
                }

                return normalizedDate;
            }

            function getTransactionTypeValue(transaction) {
                if (!transaction || !transaction.type) {
                    return '';
                }

                return ((transaction.type.code || '') + ' ' + (transaction.type.value || '')).toLowerCase();
            }

            function getLoanOfficeId(data) {
                if (!data) {
                    return null;
                }

                return data.officeId || data.clientOfficeId || (data.fromOffice && data.fromOffice.id) || (data.fromClient && data.fromClient.officeId) || null;
            }

            function buildRecoveryReversalIndex(transactions) {
                var recoveryReversalTransactionsByOriginalId = {};
                if (!transactions || !transactions.length) {
                    return recoveryReversalTransactionsByOriginalId;
                }

                for (var i = 0; i < transactions.length; i++) {
                    var transaction = transactions[i];
                    var originalTransactionId = extractTransactionId(transaction && transaction.originalTransactionId);
                    if (transaction && transaction.reversalTransaction === true && originalTransactionId) {
                        recoveryReversalTransactionsByOriginalId[originalTransactionId] = transaction;
                    }
                }

                return recoveryReversalTransactionsByOriginalId;
            }

            scope.isRecoveryPaymentTransaction = function (transaction) {
                var transactionTypeValue = getTransactionTypeValue(transaction);
                return !!(transaction && (transaction.isRecoveryPayment === true
                    || (transaction.type && transaction.type.recoveryRepayment === true)
                    || transactionTypeValue.indexOf('recovery') !== -1));
            };

            scope.canViewTransaction = function (transaction) {
                if (!transaction || !transaction.type) {
                    return false;
                }

                return transaction.type.id == 2 || transaction.type.id == 4 || transaction.type.id == 1 || transaction.type.id == 6
                    || scope.isRecoveryPaymentTransaction(transaction);
            };

            scope.routeTo = function (loanId, transaction) {
                if (scope.canViewTransaction(transaction)) {
                    $rootScope.rates = scope.loandetails.rates;
                    location.path('/viewloantrxn/' + loanId + '/trxnId/' + transaction.id);
                }
            };

            scope.getRelatedTransactionId = function (transactionRef) {
                return extractTransactionId(transactionRef);
            };

            scope.getRelatedTransactionDate = function (transactionRef) {
                return extractTransactionDate(transactionRef);
            };

            scope.getTransactionCorrectionDate = function (transaction) {
                if (!transaction || !transaction.correctionDate) {
                    return null;
                }

                var normalizedDate = normalizeDate(transaction.correctionDate);
                if (normalizedDate) {
                    transaction.correctionDate = normalizedDate;
                }

                return normalizedDate;
            };

            scope.getRecoveryReversalTransaction = function (transaction) {
                var transactionId = extractTransactionId(transaction && transaction.id);
                if (!transactionId || !scope.isRecoveryPaymentTransaction(transaction) || transaction.reversalTransaction === true || transaction.manuallyReversed !== true) {
                    return null;
                }

                return scope.recoveryReversalTransactionsByOriginalId[transactionId]
                    || (angular.isObject(transaction && transaction.reversalTransaction) ? transaction.reversalTransaction : null);
            };

            scope.canReverseRecoveryPayment = function (transaction) {
                return scope.isRecoveryPaymentTransaction(transaction)
                    && transaction.reversalTransaction !== true
                    && transaction.manuallyReversed !== true
                    && transaction.correctionAllowed !== false;
            };

            scope.canPostCorrectedRecoveryPayment = function (transaction) {
                return scope.isRecoveryPaymentTransaction(transaction)
                    && transaction.reversalTransaction !== true
                    && transaction.manuallyReversed === true
                    && transaction.correctionAllowed !== false;
            };

            scope.openRelatedTransaction = function ($event, transactionRef) {
                var transactionId = extractTransactionId(transactionRef);
                if (!transactionId) {
                    return;
                }

                if ($event) {
                    $event.stopPropagation();
                }
                $rootScope.rates = scope.loandetails.rates;
                location.path('/viewloantrxn/' + scope.loandetails.id + '/trxnId/' + transactionId);
            };

            scope.openReverseRecoveryPaymentModal = function (transaction) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'views/loans/reverse_recovery_payment_modal.html',
                    controller: 'ReverseRecoveryPaymentModalController',
                    resolve: {
                        loanId: function () {
                            return scope.loandetails.id;
                        },
                        transaction: function () {
                            return angular.copy(transaction);
                        },
                        latestClosureDate: function () {
                            return scope.latestClosureDate;
                        },
                        dateFormat: function () {
                            return scope.df;
                        },
                        locale: function () {
                            return scope.optlang.code;
                        }
                    }
                });

                modalInstance.result.then(function () {
                    fetchLoanAccountDetails();
                });
            };

            scope.openPostCorrectedRecoveryPaymentModal = function (transaction) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'views/loans/post_corrected_recovery_payment_modal.html',
                    controller: 'PostCorrectedRecoveryPaymentModalController',
                    resolve: {
                        loanId: function () {
                            return scope.loandetails.id;
                        },
                        transaction: function () {
                            return angular.copy(transaction);
                        },
                        latestClosureDate: function () {
                            return scope.latestClosureDate;
                        },
                        dateFormat: function () {
                            return scope.df;
                        },
                        locale: function () {
                            return scope.optlang.code;
                        }
                    }
                });

                modalInstance.result.then(function () {
                    fetchLoanAccountDetails();
                });
            };

            /***
             * we are using orderBy(https://docs.angularjs.org/api/ng/filter/orderBy) filter to sort fields in ui
             * api returns dates in array format[yyyy, mm, dd], converting the array of dates to date object
             * @param dateFieldName
             */

            scope.convertDateArrayToObject = function(dateFieldName){
                if (!scope.loandetails || !angular.isArray(scope.loandetails.transactions)) {
                    return;
                }

                for (var i = 0; i < scope.loandetails.transactions.length; i++) {
                    var transaction = scope.loandetails.transactions[i];
                    if (!transaction) {
                        continue;
                    }

                    var normalizedDate = normalizeDate(transaction[dateFieldName]);
                    if (normalizedDate) {
                        transaction[dateFieldName] = normalizedDate;
                    }
                }
            };

            // Helper function to get IC review level name from number
            scope.getIcReviewLevelName = function(levelNumber) {
                var levelNames = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
                return levelNames[levelNumber - 1] || 'level' + levelNumber;
            };

            // Helper function to check if action is IC review level
            scope.isIcReviewLevel = function(action) {
                return action && action.toLowerCase().indexOf('icreviewlevel') === 0;
            };

            // Helper function to check if action is reject IC review level
            scope.isRejectIcReviewLevel = function(action) {
                return action && action.toLowerCase().indexOf('rejecticreviewlevel') === 0;
            };

            scope.clickEvent = function (eventName, accountId) {
                eventName = eventName || "";
                switch (eventName) {
                    case "addloancharge":
                        location.path('/addloancharge/' + accountId);
                        break;
                    case "addcollateral":
                        location.path('/addcollateral/' + accountId);
                        break;
                    case "assignloanofficer":
                    case "changeloanofficer":
                        location.path('/assignloanofficer/' + accountId);
                        break;
                    case "modifyapplication":
                        location.path('/editloanaccount/' + accountId);
                        break;
                    case "approve":
                        location.path('/loanaccount/' + accountId + '/approve');
                        break;
                    case "reject":
                        location.path('/loanaccount/' + accountId + '/reject');
                        break;
                    case "withdrawnbyclient":
                        location.path('/loanaccount/' + accountId + '/withdrawnByApplicant');
                        break;
                    case "delete":
                        resourceFactory.LoanAccountResource.delete({loanId: accountId}, {}, function (data) {
                            var destination = '/viewgroup/' + data.groupId;
                            if (data.clientId) destination = '/viewclient/' + data.clientId;
                            location.path(destination);
                        });
                        break;
                    case "undoapproval":
                        location.path('/loanaccount/' + accountId + '/undoapproval');
                        break;
                    case "disbursementRequest":
                        location.path('/loanaccount/' + accountId + '/disbursementpreapprovalrequest');
                        break;
                    case "approveDisbursement":
                        location.path('/loanaccount/' + accountId + '/approveDisbursement');
                        break;
                    case "disbursetosavings":
                        location.path('/loanaccount/' + accountId + '/disbursetosavings');
                        break;
                    case "undodisbursal":
                        location.path('/loanaccount/' + accountId + '/undodisbursal');
                        break;
                    case "makerepayment":
                        location.path('/loanaccount/' + accountId + '/repayment');
                        break;
                    case "prepayment":
                        location.path('/loanaccount/' + accountId + '/prepayloan');
                        break;
                    case "waiveinterest":
                        location.path('/loanaccount/' + accountId + '/waiveinterest');
                        break;
                    case "writeoff":
                        location.path('/loanaccount/' + accountId + '/writeoff');
                        break;
                    case "recoverypayment":
                        location.path('/loanaccount/' + accountId + '/recoverypayment');
                        break;
                    case "close-rescheduled":
                        location.path('/loanaccount/' + accountId + '/close-rescheduled');
                        break;
                    case "transferFunds":
                        if (scope.loandetails.clientId) {
                            location.path('/accounttransfers/fromloans/' + accountId);
                        }
                        break;
                    case "close":
                        location.path('/loanaccount/' + accountId + '/close');
                        break;
                    case "createguarantor":
                        location.path('/guarantor/' + accountId);
                        break;
                    case "listguarantor":
                        location.path('/listguarantors/' + accountId);
                        break;
                    case "recoverguarantee":
                        location.path('/loanaccount/' + accountId + '/recoverguarantee');
                        break;
                    case "unassignloanofficer":
                        location.path('/loanaccount/' + accountId + '/unassignloanofficer');
                        break;
                    case "loanscreenreport":
                        location.path('/loanscreenreport/' + accountId);
                        break;
                    case "reschedule":
                        location.path('/loans/' +accountId + '/reschedule');
                        break;
                    case "adjustrepaymentschedule":
                        location.path('/adjustrepaymentschedule/'+accountId) ;
                        break ;
                    case "foreclosure":
                        location.path('loanforeclosure/' + accountId);
                        break;
                    case "reviewapplication":
                        location.path('/loanaccount/' + accountId + '/reviewapplication');
                        break;
                    case "rejectreviewapplication":
                        location.path('/loanaccount/' + accountId + '/rejectreviewapplication');
                        break;
                    case "duediligence":
                        location.path('/viewloanaccount/' + accountId + '/duediligence');
                        break;
                    case "rejectduediligence":
                        location.path('/loanaccount/' + accountId + '/rejectduediligence');
                        break;
                    case "collateralreview":
                        location.path('/loanaccount/' + accountId + '/collateralreview');
                        break;
                    case "rejectcollateralreview":
                        location.path('/loanaccount/' + accountId + '/rejectcollateralreview');
                        break;
                    // Dynamic IC Review Levels - handles any level (one through ten)
                    default:
                        if (scope.isIcReviewLevel(eventName) || scope.isRejectIcReviewLevel(eventName)) {
                            location.path('/loanaccount/' + accountId + '/' + eventName);
                            return;
                        }
                        break;
                    case "icreviewlevelone":
                        location.path('/loanaccount/' + accountId + '/icreviewlevelone');
                        break;
                    case "rejecticreviewlevelone":
                        location.path('/loanaccount/' + accountId + '/rejecticreviewlevelone');
                        break;
                    case "icreviewleveltwo":
                        location.path('/loanaccount/' + accountId + '/icreviewleveltwo');
                        break;
                    case "rejecticreviewleveltwo":
                        location.path('/loanaccount/' + accountId + '/rejecticreviewleveltwo');
                        break;
                    case "icreviewlevelthree":
                        location.path('/loanaccount/' + accountId + '/icreviewlevelthree');
                        break;
                    case "rejecticreviewlevelthree":
                        location.path('/loanaccount/' + accountId + '/rejecticreviewlevelthree');
                        break;
                    case "icreviewlevelfour":
                        location.path('/loanaccount/' + accountId + '/icreviewlevelfour');
                        break;
                    case "rejecticreviewlevelfour":
                        location.path('/loanaccount/' + accountId + '/rejecticreviewlevelfour');
                        break;
                    case "icreviewlevelfive":
                        location.path('/loanaccount/' + accountId + '/icreviewlevelfive');
                        break;
                    case "rejecticreviewlevelfive":
                        location.path('/loanaccount/' + accountId + '/rejecticreviewlevelfive');
                        break;
                    case "prepareandsigncontract":
                        location.path('/loanaccount/' + accountId + '/prepareandsigncontract');
                        break;
                    case "rejectprepareandsigncontract":
                        location.path('/loanaccount/' + accountId + '/rejectprepareandsigncontract');
                        break;
                    case "crbVerification":
                        resourceFactory.verifyLoanOnTransUnionRwanda.post({loanId: accountId}, function (data) {
                            scope.getCrbReport();
                            location.path('/viewloanaccount/' + accountId);
                        });

                            break;
                      case "crbVerificationKenya":
                            resourceFactory.verifyLoanOnMetropolKenya.post({loanId: accountId},function (data) {
                                 scope.crbMetropolIdentityVerification();
                                 location.path('/viewloanaccount/' + accountId);
                             });
                            break;
                      case "verifyLoanCreditInfoEnhancedOnMetropolKenya":
                              resourceFactory.verifyLoanCreditInfoEnhancedOnMetropolKenya.post({loanId: accountId},function (data) {
                                   scope.crbMetropolIdentityVerification();
                                   location.path('/viewloanaccount/' + accountId);
                               });
                              break;
                       case "verifyLoanReportJsonOnMetropolKenya":
                             resourceFactory.verifyLoanReportJsonOnMetropolKenya.post({loanId: accountId},function (data) {
                                 scope.crbMetropolIdentityVerification();
                                 location.path('/viewloanaccount/' + accountId);
                              });
                             break;
                       case "generatecashflow":
                            resourceFactory.generateCashFlow.post({loanId: accountId},function (data) {
                            scope.retrieveCashFlow();
                            location.path('/viewloanaccount/' + accountId);
                            });
                         break;
                       case "generateFinancialRatio":
                           resourceFactory.generateFinancialRatio.post({loanId: accountId},function (data) {
                           location.path('/viewloanaccount/' + accountId);
                           });
                        break;
                    case "undoforeclosure":
                        resourceFactory.undoForeClosure.post({loanId: accountId}, function (data) {
                            fetchLoanAccountDetails();
                            scope.$emit('refreshLoanDetails', {success: true, loanId: accountId});
                        }, function(error) {
                            scope.errorDetails = error.data || error;
                            scope.$emit('undoForeClosureError', error);
                        });
                        break;
                }
            };

            scope.delCharge = function (id) {
                $uibModal.open({
                    templateUrl: 'delcharge.html',
                    controller: DelChargeCtrl,
                    resolve: {
                        ids: function () {
                            return id;
                        }
                    }
                });
            };

            var DelChargeCtrl = function ($scope, $uibModalInstance, ids) {
                $scope.delete = function () {
                    resourceFactory.LoanAccountResource.delete({loanId: routeParams.id, resourceType: 'charges', chargeId: ids}, {}, function (data) {

                        $uibModalInstance.close('delete');
                        route.reload();
                    });
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            var fetchLoanAccountDetails = function () {
                resourceFactory.LoanAccountResource.getLoanAccountDetails({loanId: routeParams.id, associations: 'all',exclude: 'guarantors,futureSchedule'}, function (data) {
                    scope.loandetails = data;
                    scope.recoveryReversalTransactionsByOriginalId = buildRecoveryReversalIndex(data.transactions || []);
                    scope.productId = data.loanProductId;
                    scope.loanOfficeId = getLoanOfficeId(data);
                    scope.latestClosureDate = null;
                    scope.convertDateArrayToObject('date');
                    scope.recalculateInterest = data.recalculateInterest || true;
                    scope.isWaived = scope.loandetails.repaymentSchedule.totalWaived > 0;
                    scope.date.fromDate =  new Date(data.timeline.actualDisbursementDate);
                    scope.date.toDate = new Date();
                    scope.status = data.status.value;
                    scope.chargeAction = data.status.value == "Submitted and pending approval" ? true : false;
                    if(scope.status == 'Submitted and pending approval' || scope.status == 'Approved'){
                    scope.date.fromDate = new Date(data.timeline.submittedOnDate);
                    }
                    if(scope.loandetails.status && scope.loandetails.status.id === 200 && scope.loandetails.subStatus && scope.loandetails.subStatus.id === 200) {
                        scope.isPendingDisbursement = true;
                    } else {
                        scope.isPendingDisbursement = false;
                    }
                    scope.decimals = data.currency.decimalPlaces;
                    if (scope.loandetails.charges) {
                        scope.charges = scope.loandetails.charges;
                        for (var i in scope.charges) {
                            if (scope.charges[i].paid || scope.charges[i].waived || scope.charges[i].chargeTimeType.value == 'Disbursement' || scope.loandetails.status.value != 'Active') {
                                var actionFlag = true;
                            }
                            else {
                                var actionFlag = false;
                            }
                            scope.charges[i].actionFlag = actionFlag;
                        }

                        scope.chargeTableShow = true;
                    }
                    else {
                        scope.chargeTableShow = false;
                    }
                    if (scope.status == "Submitted and pending approval" || scope.status == "Active" || scope.status == "Approved") {
                        scope.choice = true;
                    }
                    function getLoanStage(data) {
                        if((data.isExtendLoanLifeCycleConfig == false)){
                            return {
                                name: "button.approve",
                                icon: "fa fa-check",
                                taskPermissionName: 'APPROVE_LOAN'
                            };
                        }else if((data.isExtendLoanLifeCycleConfig == true && (data.loanDecisionState == null || data.loanDecisionState == ""))){
                        return {
                            name: "button.reviewapplication",
                            icon: "fa fa-check",
                            taskPermissionName: 'ACCEPT_LOANAPPLICATIONREVIEW'
                        };
                        }else if((data.isExtendLoanLifeCycleConfig == true && (data.loanDecisionState != null && data.loanDecisionState.value == "REVIEW_APPLICATION"))){
                        return {
                            name: "button.duediligence",
                            icon: "fa fa-check",
                            taskPermissionName: 'ACCEPT_DUEDILIGENCE'
                        };
                        }else if((data.isExtendLoanLifeCycleConfig == true && (data.loanDecisionState != null && data.loanDecisionState.value == "DUE_DILIGENCE"))){
                            return {
                                name: "button.icreviewlevelone",
                                icon: "fa fa-check",
                                taskPermissionName: 'ACCEPT_LOANICREVIEWDECISIONLEVELONE'
                        };
                        }
                        // Dynamic IC Review Level handling
                        else if((data.isExtendLoanLifeCycleConfig == true && data.loanDecisionState != null &&
                                 data.loanDecisionState.value && data.loanDecisionState.value.indexOf('IC_REVIEW_LEVEL_') === 0 &&
                                 data.nextLoanIcReviewDecisionState && data.nextLoanIcReviewDecisionState.value &&
                                 data.nextLoanIcReviewDecisionState.value.indexOf('IC_REVIEW_LEVEL_') === 0)){
                            // Extract level name from next state (e.g., IC_REVIEW_LEVEL_TWO -> two)
                            var nextLevel = data.nextLoanIcReviewDecisionState.value.replace('IC_REVIEW_LEVEL_', '').toLowerCase();
                            return {
                                name: "button.icreviewlevel" + nextLevel.toLowerCase(),
                                icon: "fa fa-check",
                                taskPermissionName: 'ACCEPT_LOANICREVIEWDECISIONLEVEL' + nextLevel.toUpperCase()
                            };
                        }
                        else if((data.isExtendLoanLifeCycleConfig == true && (data.loanDecisionState != null && data.nextLoanIcReviewDecisionState.value == "PREPARE_AND_SIGN_CONTRACT" && data.loanDecisionState.value != "PREPARE_AND_SIGN_CONTRACT"))){
                            return {
                                name: "button.prepareandsigncontract",
                                icon: "fa fa-check",
                                taskPermissionName: 'ACCEPT_LOANPREPAREANDSIGNCONTRACT'
                            };
                        } else if(((data.isExtendLoanLifeCycleConfig == true) && (data.loanDecisionState != null && data.nextLoanIcReviewDecisionState.value == "PREPARE_AND_SIGN_CONTRACT" && data.loanDecisionState.value == "PREPARE_AND_SIGN_CONTRACT"))){
                            return {
                                name: "button.approve",
                                icon: "fa fa-check",
                                taskPermissionName: 'APPROVE_LOAN'
                            };
                        }else{
                                console.log("No Options Found here . . . . ");
                            return null;
                                }
                    }

                    function getUndoLoanStage(data) {
                        if ((data.isExtendLoanLifeCycleConfig == true && (data.loanDecisionState != null && data.loanDecisionState.value === "REVIEW_APPLICATION"))) {
                            return {
                                name: "button.rejectreviewapplication",
                                icon: "fa fa-check",
                                taskPermissionName: 'REJECT_LOANAPPLICATIONREVIEW'
                            };
                        } else if ((data.isExtendLoanLifeCycleConfig == true && (data.loanDecisionState != null && data.loanDecisionState.value === "DUE_DILIGENCE"))) {
                            return {
                                name: "button.rejectduediligence",
                                icon: "fa fa-check",
                                taskPermissionName: 'REJECT_DUEDILIGENCE'
                            };
                        }
                        // Dynamic IC Review Level rejection handling
                        else if ((data.isExtendLoanLifeCycleConfig == true && data.loanDecisionState != null &&
                                  data.loanDecisionState.value && data.loanDecisionState.value.indexOf('IC_REVIEW_LEVEL_') === 0)) {
                            // Extract level name from current state (e.g., IC_REVIEW_LEVEL_ONE -> one)
                            var currentLevel = data.loanDecisionState.value.replace('IC_REVIEW_LEVEL_', '').toLowerCase();
                            return {
                                name: "button.rejecticreviewlevel" + currentLevel.toLowerCase(),
                                icon: "fa fa-check",
                                taskPermissionName: 'REJECT_LOANICREVIEWDECISIONLEVEL' + currentLevel.toUpperCase()
                            };
                        }
                        else if ((data.isExtendLoanLifeCycleConfig == true && (data.loanDecisionState != null && data.loanDecisionState.value === "PREPARE_AND_SIGN_CONTRACT"))) {
                            return {
                                name: "button.rejectprepareandsigncontract",
                                icon: "fa fa-check",
                                taskPermissionName: 'REJECT_LOANPREPAREANDSIGNCONTRACT'
                            };
                        } else {
                            console.log("No Options Found here . . . . ");
                            return null;
                        }
                    }

                    function getCrbActionOptions(data) {
                        if ((data.currency.code == "RWF")) {
                            return {
                                name: "button.crbVerification",
                                icon: "fa fa-search",
                                taskPermissionName: 'VERIFYLOANONTRANSUNIONCRBRWANDA_LOAN'
                            };
                        }
                    }

                    function getIdentityVerificationActionOptions(data) {
                        if ((data.currency.code == "KES" && data.clientLegalForm == 1)) {
                            return {
                                name: "button.crbVerificationKenya",
                                taskPermissionName: 'VERIFYLOANONMETROPOLCRBKENYA_LOAN'
                            };
                        }
                    }

                    function getCreditInfoEnhancedActionOptions(data) {
                        if ((data.currency.code == "KES")) {
                            return {
                                name: "button.verifyLoanCreditInfoEnhancedOnMetropolKenya",
                                taskPermissionName: 'VERIFYLOANCREDITINFOENHANCEDONMETROPOLCRBKENYA_LOAN'
                            };
                        }
                    }

                    function getCreditReportJsonActionOptions(data) {
                        if ((data.currency.code == "KES")) {
                            return {
                                name: "button.verifyLoanReportJsonOnMetropolKenya",
                                taskPermissionName: 'VERIFYLOANREPORTJSONONMETROPOLCRBKENYA_LOAN'
                            };
                        }
                    }

                    // Generate Cashflow button - only available during Due Diligence stage
                    function getGenerateCashflowActionOptions(data) {
                        if (data.isExtendLoanLifeCycleConfig == true &&
                            data.loanDecisionState != null &&
                            data.loanDecisionState.value === "DUE_DILIGENCE") {
                            return {
                                name: "button.generatecashflow",
                                taskPermissionName: 'GENERATE_CASHFLOW_LOAN'
                            };
                        }
                        return undefined;
                    }

                    if (data.status.value == "Submitted and pending approval") {
                        scope.buttons = { singlebuttons: [
                            {
                                name: "button.addloancharge",
                                icon: "fa fa-plus",
                                taskPermissionName: 'CREATE_LOANCHARGE'
                            },
                            getLoanStage(data),
                            getUndoLoanStage(data),
                            getCrbActionOptions(data),
                            {
                                name: "button.modifyapplication",
                                icon: "fa fa-pincel-square-o",
                                taskPermissionName: 'UPDATE_LOAN'
                            }
                        ],
                            options: [
                                {
                                    name: (scope.loandetails.loanOfficerName?"button.changeloanofficer":"button.assignloanofficer"),
                                    taskPermissionName: 'UPDATELOANOFFICER_LOAN'
                                },
                                {
                                    name: "button.withdrawnbyclient",
                                    taskPermissionName: 'WITHDRAW_LOAN'
                                },
                                {
                                    name: "button.delete",
                                    taskPermissionName: 'DELETE_LOAN'
                                },
                                {
                                    name: "button.generateFinancialRatio",
                                    taskPermissionName: 'GENERATE_FINANCIALRATIO_LOAN'
                                },
                                {
                                    name: "button.addcollateral",
                                    taskPermissionName: 'CREATE_COLLATERAL'
                                },
                                {
                                    name: "button.listguarantor",
                                    taskPermissionName: 'READ_GUARANTOR'
                                },
                                {
                                    name: "button.createguarantor",
                                    taskPermissionName: 'CREATE_GUARANTOR'
                                },
                                {
                                    name: "button.loanscreenreport",
                                    taskPermissionName: 'READ_LOAN'
                                },
                                ...[
                                    getGenerateCashflowActionOptions(data),
                                    getIdentityVerificationActionOptions(data),
                                    getCreditInfoEnhancedActionOptions(data),
                                    getCreditReportJsonActionOptions(data)
                                ].filter(option => option !== undefined)
                            ]

                        };
                        if(data.isVariableInstallmentsAllowed) {
                            scope.buttons.options.push({
                                name: "button.adjustrepaymentschedule",
                                taskPermissionName: 'ADJUST_REPAYMENT_SCHEDULE'
                            }) ;
                        }
                    }
                    if (data.status.value == "Approved") {
                        scope.buttons = { singlebuttons: [
                            {
                                name: (scope.loandetails.loanOfficerName?"button.changeloanofficer":"button.assignloanofficer"),
                                icon: "fa fa-user",
                                taskPermissionName: 'UPDATELOANOFFICER_LOAN'
                            }
                        ],
                            options: [
                                {
                                    name: "button.addloancharge",
                                    taskPermissionName: 'CREATE_LOANCHARGE'
                                },
                                {
                                    name: "button.listguarantor",
                                    taskPermissionName: 'READ_GUARANTOR'
                                },
                                {
                                    name: "button.createguarantor",
                                    taskPermissionName: 'CREATE_GUARANTOR'
                                },
                                {
                                    name: "button.loanscreenreport",
                                    taskPermissionName: 'READ_LOAN'
                                }
                            ]

                        };

                        if(!data.subStatus || (data.subStatus && data.subStatus.code !== 'loanSubStatus.loanSubStatusType.pending.disbursement' && data.subStatus.id !==300)) {
                            scope.buttons.singlebuttons.push({
                                name: "button.disbursementRequest",
                                icon: "fa fa-flag",
                                taskPermissionName: 'DISBURSEMENTPREAPPROVAL_LOAN'
                            });
                            scope.buttons.singlebuttons.push({
                                name: "button.disbursetosavings",
                                icon: "fa fa-flag",
                                taskPermissionName: 'DISBURSETOSAVINGS_LOAN'
                            });
                            scope.buttons.singlebuttons.push({
                                name: "button.undoapproval",
                                icon: "fa fa-undo",
                                taskPermissionName: 'APPROVALUNDO_LOAN'
                            });
                        }

                        else if(!data.subStatus || (data.subStatus && data.subStatus.id == 300)) {
                            scope.buttons.singlebuttons.push({
                                name: "button.approveDisbursement",
                                icon: "fa fa-flag",
                                taskPermissionName: 'DISBURSE_LOAN'
                            });
                        }
                    }
                    if (data.status.value == "Active") {
                        scope.buttons = { singlebuttons: [
                            {
                                name: "button.addloancharge",
                                icon: "fa fa-plus",
                                taskPermissionName: 'CREATE_LOANCHARGE'
                            },
                            {
                                name: "button.foreclosure",
                                icon: "icon-dollar",
                                taskPermissionName: 'FORECLOSURE_LOAN'
                            },
                            {
                                name: "button.makerepayment",
                                icon: "fa fa-dollar",
                                taskPermissionName: 'REPAYMENT_LOAN'
                            },
                            {
                                name: "button.undodisbursal",
                                icon: "fa fa-undo",
                                taskPermissionName: 'DISBURSALUNDO_LOAN'
                            }
                        ],
                            options: [
                                {
                                    name: "button.waiveinterest",
                                    taskPermissionName: 'WAIVEINTERESTPORTION_LOAN'
                                },
                                {
                                    name: "button.reschedule",
                                    taskPermissionName: 'CREATE_RESCHEDULELOAN'
                                },
                                {
                                    name: "button.writeoff",
                                    taskPermissionName: 'WRITEOFF_LOAN'
                                },

                                // {
                                //     name: "button.payoff",
                                //     taskPermissionName: 'PAY_OFF_LOAN'
                                // },
                                {
                                    name: "button.close-rescheduled",
                                    taskPermissionName: 'CLOSEASRESCHEDULED_LOAN'
                                },
                                {
                                    name: "button.close",
                                    taskPermissionName: 'CLOSE_LOAN'
                                },
                                {
                                    name: "button.loanscreenreport",
                                    taskPermissionName: 'READ_LOAN'
                                },
                                {
                                    name: "button.listguarantor",
                                    taskPermissionName: 'READ_GUARANTOR'
                                },
                                {
                                    name: "button.createguarantor",
                                    taskPermissionName: 'CREATE_GUARANTOR'
                                },
                                {
                                    name: "button.recoverguarantee",
                                    taskPermissionName: 'RECOVERGUARANTEES_LOAN'
                                }
                            ]

                        };

                        if (data.canDisburse) {
                            scope.buttons.singlebuttons.splice(1, 0, {
                                name: "button.disburse",
                                icon: "fa fa-flag",
                                taskPermissionName: 'DISBURSE_LOAN'
                            });
                            scope.buttons.singlebuttons.splice(1, 0, {
                                name: "button.disbursetosavings",
                                icon: "fa fa-flag",
                                taskPermissionName: 'DISBURSETOSAVINGS_LOAN'
                            });
                        }
                        //loan officer not assigned to loan, below logic
                        //helps to display otherwise not
                        if (!data.loanOfficerName) {
                            scope.buttons.singlebuttons.splice(1, 0, {
                                name: "button.assignloanofficer",
                                icon: "fa fa-user",
                                taskPermissionName: 'UPDATELOANOFFICER_LOAN'
                            });
                        }

                        if(scope.recalculateInterest){
                            scope.buttons.singlebuttons.splice(1, 0, {
                                name: "button.prepayment",
                                icon: "fa fa-money",
                                taskPermissionName: 'REPAYMENT_LOAN'
                            });
                        }
                    }
                    if (data.status.value == "Overpaid") {
                        scope.buttons = { singlebuttons: [
                            {
                                name: "button.transferFunds",
                                icon: "fa fa-exchange",
                                taskPermissionName: 'CREATE_ACCOUNTTRANSFER'
                            }
                        ]
                        };
                    }
                    if (data.status.value == "Closed (written off)") {
                        scope.buttons = { singlebuttons: [
                            {
                                name: "button.recoverypayment",
                                icon: "fa fa-briefcase",
                                taskPermissionName: 'RECOVERYPAYMENT_LOAN'
                            }
                        ]
                        };
                    }
                    if (data.status.value == "Closed (obligations met)" && (data.subStatus.value == "Foreclosed")) {
                        scope.buttons = { singlebuttons: [
                                {
                                    name: "button.undoforeclosure",
                                    icon: "fa fa-money",
                                    taskPermissionName: 'UNDOFORECLOSURE_LOAN'
                                }
                            ]
                        };
                    }

                    resourceFactory.standingInstructionTemplateResource.get({fromClientId: scope.loandetails.clientId,fromAccountType: 1,fromAccountId: routeParams.id},function (response) {
                        scope.standinginstruction = response;
                        scope.searchTransaction();
                    }, function () {
                        scope.standinginstruction = null;
                        scope.searchTransaction();
                    });

                    resourceFactory.creditBureauByLoanProductId.get({loanProductId: scope.productId}, function (data) {
                        scope.cblpstatuses = data;
                        scope.cblpstatusactive = data.isActive;
                        scope.cbIsCreditCheckMandatory = data.isCreditCheckMandatory;

                        if (data.isActive && data.currency && data.currency.code == "RWF") {
                            scope.getCrbReport();
                        } else if (data.isActive && data.currency && data.currency.code == "KES") {
                            scope.crbMetropolIdentityVerification();
                        }
                    }, function () {
                        scope.cblpstatuses = null;
                        scope.cblpstatusactive = false;
                        scope.cbIsCreditCheckMandatory = false;
                    });

                    if(data.nextLoanIcReviewDecisionState != null && data.nextLoanIcReviewDecisionState.value == "PREPARE_AND_SIGN_CONTRACT"){
                        scope.showApprovedICAmount = true;
                    }
                });
            }

            fetchLoanAccountDetails();

            var fetchFunction = function (offset, limit, callback) {
                var params = {};
                params.offset = offset;
                params.limit = limit;
                params.locale = scope.optlang.code;
                params.fromAccountId = routeParams.id;
                params.fromAccountType = 1;
                params.clientId = scope.loandetails.clientId;
                params.clientName = scope.loandetails.clientName;
                params.dateFormat = scope.df;

                resourceFactory.standingInstructionResource.search(params, callback);
            };

            scope.searchTransaction = function () {
                scope.displayResults = true;
                scope.instructions = paginatorService.paginate(fetchFunction, 14);
                scope.isCollapsed = false;
            };

            scope.deletestandinginstruction = function (id) {
                $uibModal.open({
                    templateUrl: 'delInstruction.html',
                    controller: DelInstructionCtrl,
                    resolve: {
                        ids: function () {
                            return id;
                        }
                    }
                });
            };

            var DelInstructionCtrl = function ($scope, $uibModalInstance, ids) {
                $scope.delete = function () {
                    resourceFactory.standingInstructionResource.cancel({standingInstructionId: ids}, function (data) {
                        scope.searchTransaction();
                        $uibModalInstance.close('delete');
                    });
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            resourceFactory.loanResource.getAllNotes({loanId: routeParams.id,resourceType:'notes'}, function (data) {
                scope.loanNotes = data;
            });



            scope.saveNote = function () {
                resourceFactory.loanResource.save({loanId: routeParams.id, resourceType: 'notes'}, this.formData, function (data) {
                    var today = new Date();
                    temp = { id: data.resourceId, note: scope.formData.note, createdByUsername: "test", createdOn: today };
                    scope.loanNotes.push(temp);
                    scope.formData.note = "";
                    scope.predicate = '-id';
                });
            };

            scope.getLoanDocuments = function () {
                resourceFactory.LoanDocumentResource.getLoanDocuments({loanId: routeParams.id}, function (data) {
                    for (var i in data) {
                        var loandocs = {};
                        loandocs = API_VERSION + '/loans/' + data[i].parentEntityId + '/documents/' + data[i].id + '/attachment?tenantIdentifier=' + $rootScope.tenantIdentifier;
                        data[i].docUrl = loandocs;
                        if (data[i].fileName)
                            if (data[i].fileName.toLowerCase().indexOf('.jpg') != -1 || data[i].fileName.toLowerCase().indexOf('.jpeg') != -1 || data[i].fileName.toLowerCase().indexOf('.png') != -1)
                                data[i].fileIsImage = true;
                        if (data[i].type)
                             if (data[i].type.toLowerCase().indexOf('image') != -1)
                                data[i].fileIsImage = true;
                    }
                    scope.loandocuments = data;
                });

            };

            resourceFactory.DataTablesResource.getAllDataTables({apptable: 'm_loan'}, function (data) {
                scope.loandatatables = data;
            });

            scope.dataTableChange = function (datatable) {
                resourceFactory.DataTablesResource.getTableDetails({datatablename: datatable.registeredTableName,
                    entityId: routeParams.id, genericResultSet: 'true'}, function (data) {
                    scope.datatabledetails = data;
                    console.log(data);
                    scope.datatabledetails.isData = data.data.length > 0 ? true : false;
                    scope.datatabledetails.isMultirow = data.columnHeaders[0].columnName == "id" ? true : false;
                    scope.showDataTableAddButton = !scope.datatabledetails.isData || scope.datatabledetails.isMultirow;
                    scope.showDataTableEditButton = scope.datatabledetails.isData && !scope.datatabledetails.isMultirow;
                    scope.singleRow = [];
                    for (var i in data.columnHeaders) {
                        if (scope.datatabledetails.columnHeaders[i].columnCode) {
                            for (var j in scope.datatabledetails.columnHeaders[i].columnValues) {
                                for (var k in data.data) {
                                    if (data.data[k].row[i] == scope.datatabledetails.columnHeaders[i].columnValues[j].id) {
                                        data.data[k].row[i] = scope.datatabledetails.columnHeaders[i].columnValues[j].value;
                                    }
                                }
                            }
                        }
                    }
                    if (scope.datatabledetails.isData) {
                        for (var i in data.columnHeaders) {
                            if (!scope.datatabledetails.isMultirow) {
                                var row = {};
                                row.key = data.columnHeaders[i].columnName;
                                row.value = data.data[0].row[i];
                                scope.singleRow.push(row);
                            }
                        }
                    }

                });
            };

            scope.export = function () {
                scope.report = true;
                scope.printbtn = false;
                scope.viewReport = false;
                scope.viewLoanReport = true;
                scope.viewTransactionReport = false;
            };

            scope.viewJournalEntries = function(){
                location.path("/searchtransaction/").search({loanId: scope.loandetails.id});
            };

            scope.viewLoanDetails = function () {
                scope.report = false;
                scope.hidePentahoReport = true;
                scope.viewReport = false;
            };

            scope.viewLoanCollateral = function (collateralId){
                location.path('/loan/'+scope.loandetails.id+'/viewcollateral/'+collateralId).search({status:scope.loandetails.status.value});
            };

            scope.viewDataTable = function (registeredTableName,data){
                if (scope.datatabledetails.isMultirow) {
                    location.path("/viewdatatableentry/"+registeredTableName+"/"+scope.loandetails.id+"/"+data.row[0]);
                }else{
                    location.path("/viewsingledatatableentry/"+registeredTableName+"/"+scope.loandetails.id);
                }
            };

            scope.viewLoanChargeDetails = function (chargeId) {
                location.path('/loan/'+scope.loandetails.id+'/viewcharge/'+chargeId).search({loanstatus:scope.loandetails.status.value});
            };

            scope.viewprintdetails = function (outputType) {
                //scope.printbtn = true;
                scope.report = true;
                scope.viewTransactionReport = false;
                scope.viewReport = true;
                scope.hidePentahoReport = true;
                if(outputType === 'PDF'){
                 scope.formData.outputType = 'PDF';
                }else{
                 scope.formData.outputType = 'XLS';
                }


                var reportURL = $rootScope.hostUrl + API_VERSION + "/runreports/" + encodeURIComponent("Client Loan Account Schedule");
                reportURL += "?output-type=" + encodeURIComponent(scope.formData.outputType) + "&tenantIdentifier=" + $rootScope.tenantIdentifier+"&locale="+scope.optlang.code;



                var reportParams = "";
                scope.startDate = dateFilter(scope.date.fromDate, 'yyyy-MM-dd');
                scope.endDate = dateFilter(scope.date.toDate, 'yyyy-MM-dd');
                var paramName = "R_startDate";
                reportParams += encodeURIComponent(paramName) + "=" + encodeURIComponent(scope.startDate)+ "&";
                paramName = "R_endDate";
                reportParams += encodeURIComponent(paramName) + "=" + encodeURIComponent(scope.endDate)+ "&";
                paramName = "R_loanId";
                reportParams += encodeURIComponent(paramName) + "=" + encodeURIComponent(scope.loandetails.id);
                if (reportParams > "") {
                    reportURL += "&" + reportParams;
                }
                // allow untrusted urls for iframe http://docs.angularjs.org/error/$sce/insecurl

                 reportURL = $sce.trustAsResourceUrl(reportURL);
                                reportURL = $sce.valueOf(reportURL);
                                http.get(reportURL, {responseType: 'arraybuffer'})
                                    .then(function(response) {
                                        let data = response.data;
                                        let headers = response.headers;
                                        var contentType = headers('Content-Type');
                                        var file = new Blob([data], {type: contentType});
                                        var fileContent = URL.createObjectURL(file);

                                        // Pass the form data to the iframe as a data url.
                                        scope.baseURL = $sce.trustAsResourceUrl(fileContent);
                                        scope.viewReportDetails = $sce.trustAsResourceUrl(fileContent);
                                    })
                                    .catch(function(error){
                                        $log.error(`Error loading ${scope.reportType} report`);
                                        $log.error(error);
                                    });
            };

            scope.viewloantransactionreceipts = function (transactionId) {
                //scope.printbtn = true;
                scope.report = true;
                scope.viewTransactionReport = true;
                scope.viewLoanReport = false;
                scope.viewReport = true;
                scope.hidePentahoReport = true;
                scope.formData.outputType = 'PDF';
                scope.baseURL = $rootScope.hostUrl + API_VERSION + "/runreports/" + encodeURIComponent("Loan Transaction Receipt");
                scope.baseURL += "?output-type=" + encodeURIComponent(scope.formData.outputType) + "&tenantIdentifier=" + $rootScope.tenantIdentifier+"&locale="+scope.optlang.code;

                var reportParams = "";
                var paramName = "R_transactionId";
                reportParams += encodeURIComponent(paramName) + "=" + encodeURIComponent(transactionId);
                if (reportParams > "") {
                    scope.baseURL += "&" + reportParams;
                }
                // allow untrusted urls for iframe http://docs.angularjs.org/error/$sce/insecurl
                scope.viewReportDetails = $sce.trustAsResourceUrl(scope.baseURL);
                $window.open(scope.viewReportDetails); //Just Testing If Data comes back but will be removed

            };
            scope.viewloantransactionjournalentries = function(transactionId){
                var transactionId = "L" + transactionId;
                if(scope.loandetails.clientId != null && scope.loandetails.clientId != ""){
                    location.path('/viewtransactions/' + transactionId).search({productName: scope.loandetails.loanProductName,loanId:scope.loandetails.id,clientId: scope.loandetails.clientId,
                        accountNo: scope.loandetails.accountNo,clientName: scope.loandetails.clientName});
                }else{
                    location.path('/viewtransactions/' + transactionId).search({productName: scope.loandetails.loanProductName,loanId:scope.loandetails.id,accountNo: scope.loandetails.accountNo,
                        groupId :scope.loandetails.group.id,groupName :scope.loandetails.group.name});

                }

            };

            scope.printReport = function () {
                window.print();
                window.close();
            }

            scope.deleteAll = function (apptableName, entityId) {
                resourceFactory.DataTablesResource.delete({datatablename: apptableName, entityId: entityId, genericResultSet: 'true'}, {}, function (data) {
                    route.reload();
                });
            };

            scope.deleteDocument = function (documentId, index) {
                resourceFactory.LoanDocumentResource.delete({loanId: scope.loandetails.id, documentId: documentId}, '', function (data) {
                    scope.loandocuments.splice(index, 1);
                });
            };

            scope.renameDocument = function (document, index) {
                $uibModal.open({
                    templateUrl: 'renameDocumentDialog.html',
                    controller: RenameLoanDocumentCtrl,
                    resolve: {
                        documentData: function () {
                            return {
                                id: document.id,
                                name: document.name,
                                description: document.description,
                                index: index
                            };
                        }
                    }
                });
            };

            var RenameLoanDocumentCtrl = function ($scope, $uibModalInstance, documentData) {
                $scope.renameData = {
                    name: documentData.name,
                    description: documentData.description
                };
                $scope.documentId = documentData.id;
                $scope.documentIndex = documentData.index;

                $scope.confirm = function () {
                    resourceFactory.LoanDocumentResource.update({
                        loanId: scope.loandetails.id,
                        documentId: $scope.documentId
                    }, $scope.renameData, function (data) {
                        scope.loandocuments[$scope.documentIndex].name = $scope.renameData.name;
                        scope.loandocuments[$scope.documentIndex].description = $scope.renameData.description;
                        $uibModalInstance.close('rename');
                    });
                };

                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            scope.downloadDocument = function (document) {
                var url = scope.hostUrl + document.docUrl;
                var sessionData = webStorage.get('sessionData');
                var headers = { "Authorization": "Basic " + sessionData.authenticationKey };

                var userData = localStorageService.getFromLocalStorage('userData');

                if (userData.isTwoFactorAuthenticationRequired && userData.authenticated){
                    headers["Fineract-Platform-TFA-Token"] = http.defaults.headers.common['Fineract-Platform-TFA-Token'];
                }

                fetch(url, {
                    method: 'GET',
                    headers
                })
                .then((res) => res.blob())
                .then((blob) => {
                    var _url = window.URL.createObjectURL(blob);
                    window.open(_url, "_blank").focus();
                });
            };

            scope.transactionSort = {
                column: 'date',
                descending: true
            };
            scope.changeTransactionSort = function(column) {
                var sort = scope.transactionSort;
                if (sort.column == column) {
                    sort.descending = !sort.descending;
                } else {
                    sort.column = column;
                    sort.descending = true;
                }
            };

            scope.showEdit = function(disbursementDetail){
                if((!disbursementDetail.actualDisbursementDate || disbursementDetail.actualDisbursementDate == null)
                    && scope.status =='Approved'){
                    return true;
                }
                return false;
            };

            scope.showApprovedAmountBasedOnStatus = function () {
                if (scope.status == 'Submitted and pending approval' || scope.status == 'Withdrawn by applicant' || scope.status == 'Rejected') {
                    return false;
                }
                return true;
            };
            scope.showDisbursedAmountBasedOnStatus = function(){
                if(scope.status == 'Submitted and pending approval' ||scope.status == 'Withdrawn by applicant' || scope.status == 'Rejected' ||
                    scope.status == 'Approved'){
                    return false;
                }
                return true;
            };

            scope.checkStatus = function(){
                if(scope.status == 'Active' || scope.status == 'Closed (obligations met)' || scope.status == 'Overpaid' ||
                    scope.status == 'Closed (rescheduled)' || scope.status == 'Closed (written off)'){
                    return true;
                }
                return false;
            };
            scope.checkStatusNotActive = function(){
                if(scope.status == 'Submitted and pending approval' || scope.status == 'Approved'){
                    return true;
                }
                return false;
            };

            scope.showAddDeleteTrancheButtons = function(action){
                scope.return = true;
                if(scope.status == 'Closed (obligations met)' || scope.status == 'Overpaid' ||
                    scope.status == 'Closed (rescheduled)' || scope.status == 'Closed (written off)' ||
                    scope.status =='Submitted and pending approval'){
                    scope.return = false;
                }
                scope.totalDisbursedAmount = 0;
                scope.count = 0;
                for (var i in scope.loandetails.disbursementDetails) {
                    if (scope.loandetails.disbursementDetails[i].actualDisbursementDate != null) {
                        scope.totalDisbursedAmount += scope.loandetails.disbursementDetails[i].principal;
                    }
                    else{
                        scope.count +=  1;
                    }
                }
                if(scope.totalDisbursedAmount == scope.loandetails.approvedPrincipal || scope.return == false){
                    return false;
                }
                if(scope.count == 0 && action == 'deletedisbursedetails'){
                    return false;
                }

                return true;
            };
            scope.getCrbReport = function(){
              resourceFactory.fetchCrbReportForTransUnion.get({loanId: routeParams.id}, function (data) {
                  scope.crbReportTransUnion = data;
              }, function () {
                  scope.crbReportTransUnion = null;
              });
          }
           scope.crbMetropolIdentityVerification = function(){
            resourceFactory.crbMetropolIdentityVerification.get({loanId: routeParams.id}, function (data) {
                scope.crbReportMetrolpolIdentityVerification = data;
            }, function () {
                scope.crbReportMetrolpolIdentityVerification = null;
            });
        }

        scope.retrieveCashFlow = function(){
                    resourceFactory.retrieveCashFlow.get({loanId: routeParams.id}, function (data) {
                        scope.cashFlowData = data;
                        scope.projectionSize = data.cashFlowProjectionDataList.length/2;
                    });
                }

         scope.retrieveFinancialRatio = function(){
                                    resourceFactory.retrieveFinancialRatio.get({loanId: routeParams.id}, function (data) {
                                        scope.financialRatioData = data;
                                    });
                                }

        scope.calculateSums = function(cashFlowDataList, cashFlowType, particularType) {

                var filteredData = cashFlowDataList.filter(function(cash) {
                    return cash.cashFlowType === cashFlowType && cash.particularType === particularType;
                });

                var sumPreviousMonth2 = filteredData.reduce(function(sum, cash) {
                    return sum + (cash.previousMonth2 || 0); // Use 0 if value is undefined or null
                }, 0);

                var sumPreviousMonth1 = filteredData.reduce(function(sum, cash) {
                    return sum + (cash.previousMonth1 || 0);
                }, 0);

                var sumMonth0 = filteredData.reduce(function(sum, cash) {
                    return sum + (cash.month0 || 0);
                }, 0);

                return [sumPreviousMonth2, sumPreviousMonth1, sumMonth0];
            };

        scope.calculateAndSaveTotalIncome = function (amount) {
                    scope.totalIncome.push(amount);
                };
        scope.calculateAndSaveTotalExpense = function (amount) {
                    scope.totalExpense.push(amount);
                };

        scope.calculateNetCashFlow = function(index) {
            if (index >= scope.totalIncome.length || index >= scope.totalExpense.length) {
                return 0;
            }
            var income = scope.totalIncome[index];
            var expense = scope.totalExpense[index];
            return income - expense;
        };

        scope.openCashFlowEditModal = function (id) {
            scope.projectionUpdate= {};
            var totalInstallments = scope.loandetails.numberOfRepayments;
            scope.installmentMonthsOptions = [];
            scope.projectionCashFlowType = [{id: 1, value: 'INCOME'},{id: 2, value: 'EXPENSE'}];
            for(i = 1; i <= totalInstallments; i++) {
               scope.installmentMonthsOptions.push({id: i, value: i});
            }
            $uibModal.open({
                templateUrl: 'cashFlowProjectionUpdateModal.html',
                scope: scope,
                controller: AddCashFlowProjectionRateCtrl,
                resolve: {
                            installmentMonthsOptions: function() {
                            return scope.installmentMonthsOptions;
                        }
                    }

            });

            };

            var AddCashFlowProjectionRateCtrl = function ($scope, $uibModalInstance) {

                $scope.submitForm = function () {
                    resourceFactory.generateCashFlow.post({loanId: routeParams.id, cashFlowType: this.projectionUpdate.cashFlowType,
                     month: this.projectionUpdate.month, projectionRate: this.projectionUpdate.projectionRate, locale: scope.optlang.code},function (data) {
                        $uibModalInstance.close('updateCashFlowProjection');
                        route.reload();
                    });
                }

                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

        }


    });
    mifosX.ng.application.controller('ViewLoanDetailsController', ['$scope', '$routeParams', 'ResourceFactory','PaginatorService', '$location', '$route', '$http', '$uibModal', 'dateFilter', 'API_VERSION', '$sce', '$rootScope','$window', '$interval', 'webStorage', 'localStorageService', mifosX.controllers.ViewLoanDetailsController]).run(function ($log) {
        $log.info("ViewLoanDetailsController initialized");
    });
}(mifosX.controllers || {}));
