(function (module) {
    mifosX.controllers = _.extend(module, {
        LoanAccountActionsController: function (scope, rootScope, resourceFactory, location, routeParams, dateFilter) {

            scope.action = routeParams.action || "";
            scope.accountId = routeParams.id;
            scope.formData = {};
            scope.entityformData = {datatables: {}};
            scope.showDateField = true;
            scope.showNoteField = true;
            scope.noteFieldMandatory = false;
            scope.showAmountField = false;
            scope.restrictDate = new Date();
            scope.error = false;
            // Transaction UI Related
            scope.isTransaction = false;
            scope.showPaymentDetails = false;
            scope.paymentTypes = [];
            scope.form = {};
            scope.form.expectedDisbursementDate = [];
            scope.disbursementDetails = [];
            scope.showTrancheAmountTotal = 0;
            scope.processDate = false;
            scope.submittedDatatables = [];
            scope.showClientOtherInfoForm = false;
            scope.clientOtherInfoData = {};
            scope.paymentToOptions = [
                {id: 1, name: 'label.input.paymentto.client'},
                {id: 2, name: 'label.input.paymentto.supplier'}
            ];
            // Helper function to extract level number from action name (e.g., 'icreviewlevelsix' -> 6)
            var icLevelWordToNumber = {
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
                'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
            };

            scope.getIcReviewLevelNumber = function(action) {
                if (!action) return null;
                var match = action.match(/^(reject)?icreviewlevel(\w+)$/);
                if (match) {
                    var levelWord = match[2].toLowerCase();
                    return icLevelWordToNumber[levelWord] || null;
                }
                return null;
            };

            scope.isDynamicIcReviewLevel = function(action) {
                var levelNumber = scope.getIcReviewLevelNumber(action);
                return levelNumber !== null && levelNumber >= 6;
            };

            scope.applyIcReviewTemplateDefaults = function (data) {
                if (!data) {
                    return;
                }
                if (data.dueDiligenceRecommendedAmount != null && scope.formData.icReviewRecommendedAmount == null) {
                    scope.formData.icReviewRecommendedAmount = data.dueDiligenceRecommendedAmount;
                }
                if (data.dueDiligenceTermFrequency != null && scope.formData.icReviewTermFrequency == null) {
                    scope.formData.icReviewTermFrequency = data.dueDiligenceTermFrequency;
                }
                if (data.dueDiligenceTermFrequencyType != null && scope.formData.icReviewTermPeriodFrequencyEnum == null) {
                    scope.formData.icReviewTermPeriodFrequencyEnum = data.dueDiligenceTermFrequencyType;
                }
            };

            scope.loadIcReviewTemplate = function(levelNumber, onLoaded) {
                var params = {
                    loanId: scope.accountId,
                    templateType: 'icreview'
                };
                if (levelNumber != null) {
                    params.approvingLevelNumber = levelNumber;
                }
                resourceFactory.loanTemplateResource.get(params, function (data) {
                    scope.icreviewTemplate = data;
                    scope.applyIcReviewTemplateDefaults(data);
                    if (onLoaded) {
                        onLoaded(data);
                    }
                });
            };

            scope.isICReview = scope.action === 'icreviewlevelone' || scope.action === 'icreviewleveltwo' || scope.action === 'icreviewlevelthree' || scope.action === 'icreviewlevelfour' || scope.action === 'icreviewlevelfive' || (scope.isDynamicIcReviewLevel(scope.action) && scope.action.indexOf('rejecticreviewlevel') !== 0);
            scope.isRecoveryPaymentAction = routeParams.action === 'recoverypayment';
            scope.transactionDateMinDate = '2000-01-01';
            scope.recoveryPaymentWriteOffOnDate = null;
            scope.recoveryPaymentDateErrorCode = null;
            scope.recoveryPaymentDateErrorArgs = null;
            var submitStatus = [];

            rootScope.RequestEntities = function (entity, status, productId) {
                resourceFactory.entityDatatableChecksResource.getAll({limit: -1}, function (response) {
                    scope.entityDatatableChecks = _.filter(response.pageItems, function (datatable) {
                        var specificProduct = (datatable.entity == entity && datatable.status.value == status && datatable.productId == productId);
                        var AllProducts = (datatable.entity == entity && datatable.status.value == status);
                        return (datatable.productId ? specificProduct : AllProducts);
                    });
                    scope.entityDatatableChecks = _.pluck(scope.entityDatatableChecks, 'datatableName');
                    scope.datatables = [];
                    var k = 0;
                    _.each(scope.entityDatatableChecks, function (entitytable) {
                        resourceFactory.DataTablesResource.getTableDetails({
                            datatablename: entitytable,
                            entityId: routeParams.id,
                            genericResultSet: 'true'
                        }, function (data) {
                            data.registeredTableName = entitytable;
                            var colName = data.columnHeaders[0].columnName;
                            if (colName == 'id') {
                                data.columnHeaders.splice(0, 1);
                            }

                            colName = data.columnHeaders[0].columnName;
                            if (colName == 'client_id' || colName == 'office_id' || colName == 'group_id' || colName == 'center_id' || colName == 'loan_id' || colName == 'savings_account_id') {
                                data.columnHeaders.splice(0, 1);
                                scope.isCenter = (colName == 'center_id') ? true : false;
                            }


                            data.noData = (data.data.length == 0);
                            if (data.noData) {
                                scope.datatables.push(data);
                                scope.entityformData.datatables[k] = {data: {}};
                                submitStatus[k] = "save";
                                _.each(data.columnHeaders, function (Header) {
                                    scope.entityformData.datatables[k].data[Header.columnName] = "";
                                });
                                k++;
                                scope.isEntityDatatables = true;
                            }
                        });


                    });

                });
            };

            scope.fetchEntities = function (entity, status, productId) {
                if (!productId) {
                    resourceFactory.LoanAccountResource.getLoanAccountDetails({loanId: routeParams.id}, function (data) {
                        scope.productId = data.loanProductId;
                        scope.clientId = data.clientId;
                        rootScope.RequestEntities(entity, status, scope.productId);
                    });
                } else {
                    rootScope.RequestEntities(entity, status, productId);
                }
            };

            //Stack overflow
            function asyncLoop(iterations, func, callback) {
                var index = 0;
                var done = false;
                var loop = {
                    next: function () {
                        if (done) {
                            return;
                        }

                        if (index < iterations) {
                            index++;
                            func(loop);

                        } else {
                            done = true;
                            callback();
                        }
                    },

                    iteration: function () {
                        return index - 1;
                    },

                    break: function () {
                        done = true;
                    }
                };
                loop.next();
                return loop;
            }

            switch (scope.action) {
                case "approve":
                    scope.taskPermissionName = 'APPROVE_LOAN';
                    resourceFactory.loanTemplateResource.get({
                        loanId: scope.accountId,
                        templateType: 'approval'
                    }, function (data) {

                        scope.title = 'label.heading.approveloanaccount';
                        scope.labelName = 'label.input.approvedondate';
                        scope.modelName = 'approvedOnDate';
                        scope.formData[scope.modelName] = new Date();
                        scope.showApprovalAmount = true;
                        scope.showAmountField = true;
                        scope.isTransaction = true;
                        scope.formData.approvedLoanAmount = data.approvalAmount;
                        scope.formData.transactionAmount = data.netDisbursalAmount;
                        scope.formData.paymentTo = 1;
                        scope.paymentTypes = data.paymentTypeOptions;
                        scope.isLoanDisbursementRequestEnabled = true;
                        scope.fetchEntities('m_loan', 'APPROVE');

                    });
                    resourceFactory.LoanAccountResource.getLoanAccountDetails({
                        loanId: routeParams.id,
                        associations: 'multiDisburseDetails'
                    }, function (data) {
                        scope.form.expectedDisbursementDate = new Date(data.timeline.expectedDisbursementDate);
                        scope.productId = data.loanProductId;
                        if (data.disbursementDetails != "") {
                            scope.disbursementDetails = data.disbursementDetails;
                            scope.approveTranches = true;
                        }
                        for (var i in data.disbursementDetails) {
                            scope.disbursementDetails[i].expectedDisbursementDate = new Date(data.disbursementDetails[i].expectedDisbursementDate);
                            scope.disbursementDetails[i].principal = data.disbursementDetails[i].principal;
                            scope.showTrancheAmountTotal += Number(data.disbursementDetails[i].principal);
                        }
                        scope.fetchEntities('m_loan', 'APPROVE', scope.productId);
                    });
                    break;
                case "reject":
                    scope.title = 'label.heading.rejectloanaccount';
                    scope.labelName = 'label.input.rejectedondate';
                    scope.modelName = 'rejectedOnDate';
                    scope.formData[scope.modelName] = new Date();
                    scope.taskPermissionName = 'REJECT_LOAN';
                    scope.fetchEntities('m_loan', 'REJECTED');
                    break;
                case "withdrawnByApplicant":
                    scope.title = 'label.heading.withdrawloanaccount';
                    scope.labelName = 'label.input.withdrawnondate';
                    scope.modelName = 'withdrawnOnDate';
                    scope.formData[scope.modelName] = new Date();
                    scope.taskPermissionName = 'WITHDRAW_LOAN';
                    scope.fetchEntities('m_loan', 'WITHDRAWN');
                    break;
                case "undoapproval":
                    scope.title = 'label.heading.undoapproveloanaccount';
                    scope.showDateField = false;
                    scope.taskPermissionName = 'APPROVALUNDO_LOAN';
                    scope.noteFieldMandatory = true;
                    break;
                case "undodisbursal":
                    scope.title = 'label.heading.undodisburseloanaccount';
                    scope.showDateField = false;
                    scope.taskPermissionName = 'DISBURSALUNDO_LOAN';
                    break;
                case "disbursementpreapprovalrequest":
                case "approveDisbursement":
                    const isApprove = scope.action === "approveDisbursement";

                    // Both actions should be read-only
                    scope.isReadOnly = true;

                    const command = isApprove ? "disbursementapproval" : "disbursementpreapprovalrequest";
                    const rejectCommand = isApprove ? "rejectdisbursementapproval" : "rejectdisbursementpreapproval";

                    scope.modelName = 'actualDisbursementDate';
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: command
                    }, function (data) {
                        scope.paymentTypes = data.paymentTypeOptions;
                        scope.formData.accountNumber = data.accountNumber || '';
                        scope.formData.paymentTo = 1;
                        scope.formData.checkNumber = data.checkNumber || '';
                        scope.formData.routingCode = data.routingCode || '';
                        scope.formData.receiptNumber = data.receiptNumber || '';
                        scope.formData.bankNumber = data.bankNumber || '';
                        scope.formData.clientPhoneNumber = data.clientPhoneNumber || '';
                        scope.formData.clientAccountNumber = data.clientAccountNumber || '';
                        scope.formData.clientBankName = data.clientBankName || '';
                        scope.formData.beneficiaryName = data.beneficiaryName || '';
                        scope.formData.paymentTypeId = Number(data.paymentTypeId);
                        scope.formData.paymentTo = data.paymentTo ? Number(data.paymentTo) : 1;
                        scope.formData.transactionAmount = data.netDisbursalAmount || '';
                        scope.principalPortion = data.principalPortion || '';
                        scope.interestPortion = data.interestPortion || '';
                        scope.feeChargesPortion = data.feeChargesPortion || '';
                        scope.formData[scope.modelName] = new Date();
                        if (data.fixedEmiAmount) {
                            scope.formData.fixedEmiAmount = data.fixedEmiAmount;
                            scope.showEMIAmountField = true;
                        }
                        scope.isDisbursementPreApprovalRequest = !isApprove;
                    });

                    scope.title = isApprove ? 'label.heading.approvedisbursement' : 'label.heading.disbursementpreapproval';
                    scope.labelName = 'label.input.disbursedondate';
                    scope.isTransaction = true;
                    scope.showAmountField = true;
                    scope.principalPortion = true;
                    scope.interestPortion = true;
                    scope.feeChargesPortion = true;
                    scope.noteFieldMandatory = true;
                    scope.taskPermissionName = 'DISBURSE_LOAN';
                    scope.fetchEntities('m_loan', 'DISBURSE');

                    // UI toggles for rejection
                    scope.isReject = false;
                    scope.toggleReject = function () {
                        scope.isReject = !scope.isReject;
                    };
                    scope.rejectReason = "";
                    scope.showRejectButton = true;

                    // attach commands for later use in submit()
                    scope.disburseCommands = {command, rejectCommand};
                    break;
                case "disbursetosavings":
                    scope.modelName = 'actualDisbursementDate';
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: 'disburseToSavings'
                    }, function (data) {
                        scope.formData.transactionAmount = data.amount;
                        scope.formData[scope.modelName] = new Date();
                        if (data.fixedEmiAmount) {
                            scope.formData.fixedEmiAmount = data.fixedEmiAmount;
                            scope.showEMIAmountField = true;
                        }
                    });
                    scope.title = 'label.heading.disburseloanaccount';
                    scope.labelName = 'label.input.disbursedondate';
                    scope.isTransaction = false;
                    scope.showAmountField = true;
                    scope.taskPermissionName = 'DISBURSETOSAVINGS_LOAN';
                    break;
                case "repayment":
                    scope.modelName = 'transactionDate';
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: 'repayment'
                    }, function (data) {
                        scope.paymentTypes = data.paymentTypeOptions;
                        if (data.paymentTypeOptions.length > 0) {
                            scope.formData.paymentTypeId = data.paymentTypeOptions[0].id;
                        }
                        scope.formData.transactionAmount = data.amount;
                        scope.formData[scope.modelName] = new Date(data.date) || new Date();
                        if (data.penaltyChargesPortion > 0) {
                            scope.showPenaltyPortionDisplay = true;
                        }
                    });
                    scope.title = 'label.heading.loanrepayments';
                    scope.labelName = 'label.input.transactiondate';
                    scope.isTransaction = true;
                    scope.showAmountField = true;
                    scope.taskPermissionName = 'REPAYMENT_LOAN';
                    break;
                case "prepayloan":
                    scope.modelName = 'transactionDate';
                    scope.formData.transactionDate = new Date();
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: 'prepayLoan'
                    }, function (data) {
                        scope.paymentTypes = data.paymentTypeOptions;
                        if (data.paymentTypeOptions.length > 0) {
                            scope.formData.paymentTypeId = data.paymentTypeOptions[0].id;
                        }
                        scope.formData.transactionAmount = data.amount;
                        if (data.penaltyChargesPortion > 0) {
                            scope.showPenaltyPortionDisplay = true;
                        }
                        scope.principalPortion = data.principalPortion;
                        scope.interestPortion = data.interestPortion;
                        scope.feeChargesPortion = data.feeChargesPortion;
                        scope.processDate = true;
                    });
                    scope.title = 'label.heading.prepayloan';
                    scope.labelName = 'label.input.transactiondate';
                    scope.isTransaction = true;
                    scope.showAmountField = true;
                    scope.taskPermissionName = 'REPAYMENT_LOAN';
                    scope.action = 'repayment';
                    break;
                case "waiveinterest":
                    scope.modelName = 'transactionDate';
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: 'waiveinterest'
                    }, function (data) {
                        console.log("waive interest payment types:"+data)
                        scope.paymentTypes = data.paymentTypeOptions;
                        scope.formData.transactionAmount = data.amount;
                        scope.formData[scope.modelName] = new Date(data.date) || new Date();
                    });
                    scope.title = 'label.heading.loanwaiveinterest';
                    scope.labelName = 'label.input.interestwaivedon';
                    scope.showAmountField = true;
                    scope.taskPermissionName = 'WAIVEINTERESTPORTION_LOAN';
                    break;
                case "writeoff":
                    scope.modelName = 'transactionDate';
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: 'writeoff'
                    }, function (data) {
                        scope.formData[scope.modelName] = new Date(data.date) || new Date();
                        scope.writeOffAmount = data.amount;
                        scope.isLoanWriteOff = true;
                    });
                    scope.title = 'label.heading.writeoffloanaccount';
                    scope.labelName = 'label.input.writeoffondate';
                    scope.taskPermissionName = 'WRITEOFF_LOAN';
                    scope.fetchEntities('m_loan', 'WRITE_OFF');
                    break;

                case "payoff":
                    scope.modelName = 'transactionDate';
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: 'payoff'
                    }, function (data) {
                        scope.formData[scope.modelName] = new Date(data.date) || new Date();
                        scope.writeOffAmount = data.amount;
                        scope.formData.transactionAmount = data.amount;
                        scope.isLoanWriteOff = true;
                    });
                    scope.title = 'label.heading.payoffloanaccount';
                    scope.labelName = 'label.input.payoffondate';
                    scope.taskPermissionName = 'PAY_OFF_LOAN';
                    scope.fetchEntities('m_loan', 'PAY_OFF');
                    break;
                case "close-rescheduled":
                    scope.modelName = 'transactionDate';
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: 'close-rescheduled'
                    }, function (data) {
                        scope.formData[scope.modelName] = new Date(data.date) || new Date();
                    });
                    scope.title = 'label.heading.closeloanaccountasrescheduled';
                    scope.labelName = 'label.input.closedondate';
                    scope.taskPermissionName = 'CLOSEASRESCHEDULED_LOAN';
                    break;
                case "close":
                    scope.modelName = 'transactionDate';
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: 'close'
                    }, function (data) {
                        scope.formData[scope.modelName] = new Date(data.date) || new Date();
                    });
                    scope.title = 'label.heading.closeloanaccount';
                    scope.labelName = 'label.input.closedondate';
                    scope.taskPermissionName = 'CLOSE_LOAN';
                    break;
                case "unassignloanofficer":
                    scope.title = 'label.heading.unassignloanofficer';
                    scope.labelName = 'label.input.loanofficerunassigneddate';
                    scope.modelName = 'unassignedDate';
                    scope.showNoteField = false;
                    scope.formData[scope.modelName] = new Date();
                    scope.taskPermissionName = 'REMOVELOANOFFICER_LOAN';
                    break;
                case "modifytransaction":
                    resourceFactory.loanTrxnsResource.get({
                            loanId: scope.accountId,
                            transactionId: routeParams.transactionId,
                            template: 'true'
                        },
                        function (data) {
                            scope.title = 'label.heading.editloanaccounttransaction';
                            scope.labelName = 'label.input.transactiondate';
                            scope.modelName = 'transactionDate';
                            scope.paymentTypes = data.paymentTypeOptions || [];
                            scope.formData.transactionAmount = data.amount;
                            scope.formData[scope.modelName] = new Date(data.date) || new Date();
                            if (data.paymentDetailData) {
                                if (data.paymentDetailData.paymentType) {
                                    scope.formData.paymentTypeId = data.paymentDetailData.paymentType.id;
                                }
                                scope.formData.accountNumber = data.paymentDetailData.accountNumber;
                                scope.formData.checkNumber = data.paymentDetailData.checkNumber;
                                scope.formData.routingCode = data.paymentDetailData.routingCode;
                                scope.formData.receiptNumber = data.paymentDetailData.receiptNumber;
                                scope.formData.bankNumber = data.paymentDetailData.bankNumber;
                            }
                        });
                    scope.showDateField = true;
                    scope.showNoteField = false;
                    scope.showAmountField = true;
                    scope.isTransaction = true;
                    scope.showPaymentDetails = false;
                    scope.taskPermissionName = 'ADJUST_LOAN';
                    break;
                case "deleteloancharge":
                    scope.showDelete = true;
                    scope.showNoteField = false;
                    scope.showDateField = false;
                    scope.taskPermissionName = 'DELETE_LOANCHARGE';
                    break;
                case "recoverguarantee":
                    scope.showDelete = true;
                    scope.showNoteField = false;
                    scope.showDateField = false;
                    scope.taskPermissionName = 'RECOVERGUARANTEES_LOAN';
                    break;
                case "waivecharge":
                    resourceFactory.LoanAccountResource.get({
                        loanId: routeParams.id,
                        resourceType: 'charges',
                        chargeId: routeParams.chargeId
                    }, function (data) {
                        if (data.chargeTimeType.value !== "Specified due date" && data.installmentChargeData) {
                            scope.installmentCharges = data.installmentChargeData;
                            scope.formData.installmentNumber = data.installmentChargeData[0].installmentNumber;
                            scope.installmentchargeField = true;
                        } else {
                            scope.installmentchargeField = false;
                            scope.showwaiveforspecicficduedate = true;
                        }
                    });

                    scope.title = 'label.heading.waiveloancharge';
                    scope.labelName = 'label.input.installment';
                    scope.showNoteField = false;
                    scope.showDateField = false;
                    scope.taskPermissionName = 'WAIVE_LOANCHARGE';
                    break;
                case "paycharge":
                    resourceFactory.LoanAccountResource.get({
                        loanId: routeParams.id,
                        resourceType: 'charges',
                        chargeId: routeParams.chargeId,
                        command: 'pay'
                    }, function (data) {
                        if (data.dueDate) {
                            scope.formData.transactionDate = new Date(data.dueDate);
                        }
                        if (data.chargeTimeType.value === "Instalment Fee" && data.installmentChargeData) {
                            scope.installmentCharges = data.installmentChargeData;
                            scope.formData.installmentNumber = data.installmentChargeData[0].installmentNumber;
                            scope.installmentchargeField = true;
                        }
                    });
                    scope.title = 'label.heading.payloancharge';
                    scope.showNoteField = false;
                    scope.showDateField = false;
                    scope.paymentDatefield = true;
                    scope.taskPermissionName = 'PAY_LOANCHARGE';
                    break;
                case "editcharge":
                    resourceFactory.LoanAccountResource.get({
                        loanId: routeParams.id,
                        resourceType: 'charges',
                        chargeId: routeParams.chargeId
                    }, function (data) {
                        if (data.amountOrPercentage) {
                            scope.showEditChargeAmount = true;
                            scope.formData.amount = data.amountOrPercentage;
                            if (data.dueDate) {
                                scope.formData.dueDate = new Date(data.dueDate);
                                scope.showEditChargeDueDate = true;
                            }
                        }

                    });
                    scope.title = 'label.heading.editcharge';
                    scope.showNoteField = false;
                    scope.showDateField = false;
                    scope.taskPermissionName = 'UPDATE_LOANCHARGE';
                    break;
                case "editdisbursedate":
                    resourceFactory.LoanAccountResource.getLoanAccountDetails({
                        loanId: routeParams.id,
                        associations: 'multiDisburseDetails'
                    }, function (data) {
                        scope.showEditDisburseDate = true;
                        scope.formData.approvedLoanAmount = data.approvedPrincipal;
                        scope.form.expectedDisbursementDate = new Date(data.timeline.expectedDisbursementDate);
                        for (var i in data.disbursementDetails) {
                            if (routeParams.disbursementId == data.disbursementDetails[i].id) {
                                scope.formData.updatedExpectedDisbursementDate = new Date(data.disbursementDetails[i].expectedDisbursementDate);
                                scope.formData.updatedPrincipal = data.disbursementDetails[i].principal;
                                scope.id = data.disbursementDetails[i].id;
                            }
                        }
                    });

                    scope.title = 'label.heading.editdisbursedate';
                    scope.showNoteField = false;
                    scope.showDateField = false;
                    scope.taskPermissionName = 'UPDATE_DISBURSEMENTDETAIL';
                    break;
                case "recoverypayment":
                    scope.modelName = 'transactionDate';
                    resourceFactory.loanTrxnsTemplateResource.get({
                        loanId: scope.accountId,
                        command: 'recoverypayment'
                    }, function (data) {
                        scope.paymentTypes = data.paymentTypeOptions;
                        if (data.paymentTypeOptions.length > 0) {
                            scope.formData.paymentTypeId = data.paymentTypeOptions[0].id;
                        }
                        scope.formData.transactionAmount = data.amount;
                        scope.formData[scope.modelName] = new Date();
                    });
                    scope.title = 'label.heading.recoverypayment';
                    scope.labelName = 'label.input.transactiondate';
                    scope.isTransaction = true;
                    scope.showAmountField = true;
                    scope.taskPermissionName = 'RECOVERYPAYMENT_LOAN';
                    break;
                case "adddisbursedetails":
                    resourceFactory.LoanAccountResource.getLoanAccountDetails({
                        loanId: routeParams.id,
                        associations: 'multiDisburseDetails'
                    }, function (data) {
                        scope.addDisburseDetails = true;
                        scope.formData.approvedLoanAmount = data.approvedPrincipal;
                        scope.form.expectedDisbursementDate = new Date(data.timeline.expectedDisbursementDate);

                        if (data.disbursementDetails != "") {
                            scope.disbursementDetails = data.disbursementDetails;
                        }
                        if (scope.disbursementDetails.length > 0) {
                            for (var i in scope.disbursementDetails) {
                                scope.disbursementDetails[i].expectedDisbursementDate = new Date(scope.disbursementDetails[i].expectedDisbursementDate);
                            }
                        }
                        scope.disbursementDetails.push({});
                    });

                    scope.title = 'label.heading.adddisbursedetails';
                    scope.showNoteField = false;
                    scope.showDateField = false;
                    scope.taskPermissionName = 'UPDATE_DISBURSEMENTDETAIL';
                    break;
                case "deletedisbursedetails":
                    resourceFactory.LoanAccountResource.getLoanAccountDetails({
                        loanId: routeParams.id,
                        associations: 'multiDisburseDetails'
                    }, function (data) {
                        scope.deleteDisburseDetails = true;
                        scope.formData.approvedLoanAmount = data.approvedPrincipal;
                        scope.form.expectedDisbursementDate = new Date(data.timeline.expectedDisbursementDate);
                        if (data.disbursementDetails != "") {
                            scope.disbursementDetails = data.disbursementDetails;
                        }
                        if (scope.disbursementDetails.length > 0) {
                            for (var i in scope.disbursementDetails) {
                                scope.disbursementDetails[i].expectedDisbursementDate = new Date(scope.disbursementDetails[i].expectedDisbursementDate);
                            }
                        }
                    });

                    scope.title = 'label.heading.deletedisbursedetails';
                    scope.showNoteField = false;
                    scope.showDateField = false;
                    scope.taskPermissionName = 'UPDATE_DISBURSEMENTDETAIL';
                    break;
                case "reviewapplication":
                    scope.taskPermissionName = 'ACCEPT_LOANAPPLICATIONREVIEW';
                    resourceFactory.loanTemplateResource.get({
                        loanId: scope.accountId,
                        templateType: 'approval'
                    }, function (data) {

                        scope.title = 'label.heading.reviewapplicationloanaccount';
                        scope.labelName = 'label.input.reviewApplicationOn';
                        scope.modelName = 'loanReviewOnDate';
                        scope.formData[scope.modelName] = new Date();
                        scope.noteFieldMandatory = true;
                    });

                    break;
                case "rejectreviewapplication":
                    scope.taskPermissionName = 'REJECT_LOANAPPLICATIONREVIEW';
                    scope.title = 'label.heading.rejectreviewapplicationloanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;

                    break;
                case "collateralreview":
                    scope.taskPermissionName = 'ACCEPT_LOANCOLLATERALREVIEW';
                    resourceFactory.loanTemplateResource.get({
                        loanId: scope.accountId,
                        templateType: 'approval'
                    }, function (data) {

                        scope.title = 'label.heading.collateralreviewloanaccount';
                        scope.labelName = 'label.input.collateralReviewOn';
                        scope.modelName = 'collateralReviewOn';
                        scope.formData[scope.modelName] = new Date();
                        scope.noteFieldMandatory = true;
                    });

                    break;
                case "rejectduediligence":
                    scope.taskPermissionName = 'REJECT_DUEDILIGENCE';
                    scope.title = 'label.heading.rejectduediligenceloanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;

                    break;
                case "rejectcollateralreview":
                    scope.taskPermissionName = 'REJECT_LOANCOLLATERALREVIEW';
                    scope.title = 'label.heading.rejectcollateralreviewloanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;

                    break;
                case "icreviewlevelone":
                    scope.taskPermissionName = 'ACCEPT_LOANICREVIEWDECISIONLEVELONE';
                    scope.loadIcReviewTemplate(1, function () {
                        scope.title = 'label.heading.icreviewleveloneloanaccount';
                        scope.labelName = 'label.input.icReviewOn';
                        scope.modelName = 'icReviewOn';
                        scope.formData[scope.modelName] = new Date();
                        scope.noteFieldMandatory = true;
                        scope.showRejectButton = true;
                    });

                    break;
                case "rejecticreviewlevelone":
                    scope.taskPermissionName = 'REJECT_LOANICREVIEWDECISIONLEVELONE';
                    scope.title = 'label.heading.rejecticreviewleveloneloanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;

                    break;
                case "icreviewleveltwo":
                    scope.taskPermissionName = 'ACCEPT_LOANICREVIEWDECISIONLEVELTWO';
                    scope.loadIcReviewTemplate(2, function (data) {
                        scope.title = 'label.heading.icreviewleveltwoloanaccount';
                        scope.labelName = 'label.input.icReviewOn';
                        scope.modelName = 'icReviewOn';
                        scope.formData[scope.modelName] = new Date();
                        scope.noteFieldMandatory = true;
                        scope.showRejectButton = true;
                        scope.icReviewPreviousRecommendedAmount = icReviewLoanDecisionDataObjectToArray(data.loanDecisionData, 2);
                    });

                    break;
                case "rejecticreviewleveltwo":
                    scope.taskPermissionName = 'REJECT_LOANICREVIEWDECISIONLEVELTWO';
                    scope.title = 'label.heading.rejecticreviewleveltwoloanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;

                    break;
                case "icreviewlevelthree":
                    scope.taskPermissionName = 'ACCEPT_LOANICREVIEWDECISIONLEVELTHREE';
                    scope.loadIcReviewTemplate(3, function (data) {
                        scope.title = 'label.heading.icreviewlevelthreeloanaccount';
                        scope.labelName = 'label.input.icReviewOn';
                        scope.modelName = 'icReviewOn';
                        scope.formData[scope.modelName] = new Date();
                        scope.noteFieldMandatory = true;
                        scope.showRejectButton = true;
                        scope.icReviewPreviousRecommendedAmount = icReviewLoanDecisionDataObjectToArray(data.loanDecisionData, 3);
                    });

                    break;
                case "rejecticreviewlevelthree":
                    scope.taskPermissionName = 'REJECT_LOANICREVIEWDECISIONLEVELTHREE';
                    scope.title = 'label.heading.rejecticreviewlevelthreeloanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;

                    break;
                case "icreviewlevelfour":
                    scope.taskPermissionName = 'ACCEPT_LOANICREVIEWDECISIONLEVELFOUR';
                    scope.loadIcReviewTemplate(4, function (data) {
                        scope.title = 'label.heading.icreviewlevelfourloanaccount';
                        scope.labelName = 'label.input.icReviewOn';
                        scope.modelName = 'icReviewOn';
                        scope.formData[scope.modelName] = new Date();
                        scope.noteFieldMandatory = true;
                        scope.showRejectButton = true;
                        scope.icReviewPreviousRecommendedAmount = icReviewLoanDecisionDataObjectToArray(data.loanDecisionData, 4);
                    });

                    break;
                case "rejecticreviewlevelfour":
                    scope.taskPermissionName = 'REJECT_LOANICREVIEWDECISIONLEVELFOUR';
                    scope.title = 'label.heading.rejecticreviewlevelfourloanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;

                    break;
                case "icreviewlevelfive":
                    scope.taskPermissionName = 'ACCEPT_LOANICREVIEWDECISIONLEVELFIVE';
                    scope.loadIcReviewTemplate(5, function (data) {
                        scope.title = 'label.heading.icreviewlevelfiveloanaccount';
                        scope.labelName = 'label.input.icReviewOn';
                        scope.modelName = 'icReviewOn';
                        scope.formData[scope.modelName] = new Date();
                        scope.noteFieldMandatory = true;
                        scope.showRejectButton = true;
                        scope.icReviewPreviousRecommendedAmount = icReviewLoanDecisionDataObjectToArray(data.loanDecisionData, 5);
                    });

                    break;
                case "rejecticreviewlevelfive":
                    scope.taskPermissionName = 'REJECT_LOANICREVIEWDECISIONLEVELFIVE';
                    scope.title = 'label.heading.rejecticreviewlevelfiveloanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;


                    break;
                // Dynamic IC Review Levels (6+)
                case "icreviewlevelsix":
                case "icreviewlevelseven":
                case "icreviewleveleight":
                case "icreviewlevelnine":
                case "icreviewlevelten":
                case "icreviewleveleleven":
                case "icreviewleveltwelve":
                case "icreviewlevelthirteen":
                case "icreviewlevelfourteen":
                case "icreviewlevelfifteen":
                case "icreviewlevelsixteen":
                case "icreviewlevelseventeen":
                case "icreviewleveleighteen":
                case "icreviewlevelnineteen":
                case "icreviewleveltwenty":
                    var dynamicLevelNumber = scope.getIcReviewLevelNumber(scope.action);
                    var levelWord = scope.action.replace('icreviewlevel', '').toUpperCase();
                    scope.taskPermissionName = 'ACCEPT_LOANICREVIEWDECISIONLEVEL' + levelWord;
                    scope.loadIcReviewTemplate(dynamicLevelNumber, function (data) {
                        scope.title = 'label.heading.icreviewlevel' + scope.action.replace('icreviewlevel', '') + 'loanaccount';
                        scope.labelName = 'label.input.icReviewOn';
                        scope.modelName = 'icReviewOn';
                        scope.formData[scope.modelName] = new Date();
                        scope.noteFieldMandatory = true;
                        scope.showRejectButton = true;
                        scope.icReviewPreviousRecommendedAmount = icReviewLoanDecisionDataObjectToArray(data.loanDecisionData, dynamicLevelNumber);
                    });
                    break;
                case "rejecticreviewlevelsix":
                case "rejecticreviewlevelseven":
                case "rejecticreviewleveleight":
                case "rejecticreviewlevelnine":
                case "rejecticreviewlevelten":
                case "rejecticreviewleveleleven":
                case "rejecticreviewleveltwelve":
                case "rejecticreviewlevelthirteen":
                case "rejecticreviewlevelfourteen":
                case "rejecticreviewlevelfifteen":
                case "rejecticreviewlevelsixteen":
                case "rejecticreviewlevelseventeen":
                case "rejecticreviewleveleighteen":
                case "rejecticreviewlevelnineteen":
                case "rejecticreviewleveltwenty":
                    var rejectLevelWord = scope.action.replace('rejecticreviewlevel', '').toUpperCase();
                    scope.taskPermissionName = 'REJECT_LOANICREVIEWDECISIONLEVEL' + rejectLevelWord;
                    scope.title = 'label.heading.rejecticreviewlevel' + scope.action.replace('rejecticreviewlevel', '') + 'loanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;
                    break;
                case "prepareandsigncontract":
                    scope.taskPermissionName = 'ACCEPT_LOANPREPAREANDSIGNCONTRACT';
                    resourceFactory.loanTemplateResource.get({
                        loanId: scope.accountId,
                        templateType: 'approval'
                    }, function (data) {

                        scope.title = 'label.heading.prepareandsigncontractloanaccount';
                        scope.labelName = 'label.input.prepareAndSignContractOn';
                        scope.modelName = 'icReviewOn';
                        scope.formData[scope.modelName] = new Date();
                        scope.noteFieldMandatory = true;
                    });

                    break;
                case "rejectprepareandsigncontract":
                    scope.taskPermissionName = 'REJECT_LOANPREPAREANDSIGNCONTRACT';
                    scope.title = 'label.heading.rejectprepareandsigncontractloanaccount';
                    scope.showDateField = false;
                    scope.noteFieldMandatory = true;

                    break;
            }

            scope.cancel = function () {
                location.path('/viewloanaccount/' + routeParams.id);
            };

            scope.addTrancheAmounts = function () {
                scope.showTrancheAmountTotal = 0;
                for (var i in scope.disbursementDetails) {
                    scope.showTrancheAmountTotal += Number(scope.disbursementDetails[i].principal);
                }
            };

            scope.deleteTranches = function (index) {
                scope.disbursementDetails.splice(index, 1);
            };

            scope.addTranches = function () {
                scope.disbursementDetails.push({});
            };

            scope.submit = function () {
                scope.processDate = false;
                // Only validate the note field if it is shown and mandatory
                if (scope.showNoteField && scope.noteFieldMandatory && !scope.formData.note) {
                    scope.error = 'Note field is mandatory';
                    return; // Prevent submission if note is invalid
                }
                if (scope.isSupplierNonCashPayment() && (!scope.formData.clientPhoneNumber || !scope.formData.clientAccountNumber || !scope.formData.clientBankName)) {
                    scope.error = 'Supplier payment details are mandatory';
                    return;
                }
                if (scope.isSupplierNonCashPayment() && !scope.formData.beneficiaryName) {
                    scope.error = 'Beneficiary name is mandatory for supplier payment';
                    return;
                }
                var params = {command: scope.action};
                if (scope.action == "recoverguarantee") {
                    params.command = "recoverGuarantees";
                }
                if (scope.action == "approve") {
                    this.formData.expectedDisbursementDate = dateFilter(scope.form.expectedDisbursementDate, scope.df);
                    if (scope.disbursementDetails != null) {
                        this.formData.disbursementData = [];
                        for (var i in scope.disbursementDetails) {
                            this.formData.disbursementData.push({
                                id: scope.disbursementDetails[i].id,
                                principal: scope.disbursementDetails[i].principal,
                                expectedDisbursementDate: dateFilter(scope.disbursementDetails[i].expectedDisbursementDate, scope.df),
                                loanChargeId: scope.disbursementDetails[i].loanChargeId
                            });
                        }
                        console.log("DISBURSEMENT DATA", this.formData.expectedDisbursementDate);
                    }
                    if (scope.formData.approvedLoanAmount == null) {
                        scope.formData.approvedLoanAmount = scope.showTrancheAmountTotal;
                    }
                }

                if (this.formData[scope.modelName]) {
                    this.formData[scope.modelName] = dateFilter(this.formData[scope.modelName], scope.df);
                }
                if (scope.action != "undoapproval" && scope.action != "undodisbursal" || scope.action === "paycharge") {
                    this.formData.locale = scope.optlang.code;
                    this.formData.dateFormat = scope.df;
                }
                if (scope.action == "repayment" || scope.action == "waiveinterest" || scope.action == "payoff" || scope.action == "writeoff" || scope.action == "close-rescheduled"
                    || scope.action == "close" || scope.action == "modifytransaction" || scope.action == "recoverypayment" || scope.action == "prepayloan") {
                    if (scope.action == "modifytransaction") {
                        params.command = 'modify';
                        params.transactionId = routeParams.transactionId;
                    }
                    params.loanId = scope.accountId;
                    resourceFactory.loanTrxnsResource.save(params, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "deleteloancharge") {
                    resourceFactory.LoanAccountResource.delete({
                        loanId: routeParams.id,
                        resourceType: 'charges',
                        chargeId: routeParams.chargeId
                    }, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action === "waivecharge") {
                    resourceFactory.LoanAccountResource.save({
                        loanId: routeParams.id,
                        resourceType: 'charges',
                        chargeId: routeParams.chargeId,
                        'command': 'waive'
                    }, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action === "paycharge") {
                    this.formData.transactionDate = dateFilter(this.formData.transactionDate, scope.df);
                    resourceFactory.LoanAccountResource.save({
                        loanId: routeParams.id,
                        resourceType: 'charges',
                        chargeId: routeParams.chargeId,
                        'command': 'pay'
                    }, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action === "editcharge") {
                    this.formData.dueDate = dateFilter(this.formData.dueDate, scope.df);
                    resourceFactory.LoanAccountResource.update({
                        loanId: routeParams.id,
                        resourceType: 'charges',
                        chargeId: routeParams.chargeId
                    }, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action === "editdisbursedate") {
                    this.formData.expectedDisbursementDate = dateFilter(this.formData.expectedDisbursementDate, scope.df);
                    for (var i in scope.disbursementDetails) {
                        if (scope.disbursementDetails[i].id == scope.id) {
                            scope.disbursementDetails[i].principal = scope.formData.updatedPrincipal;
                            scope.disbursementDetails[i].expectedDisbursementDate = dateFilter(scope.formData.updatedExpectedDisbursementDate, scope.df);
                        }
                    }
                    this.formData.disbursementData = [];
                    this.formData.updatedExpectedDisbursementDate = dateFilter(scope.formData.updatedExpectedDisbursementDate, scope.df);
                    this.formData.expectedDisbursementDate = dateFilter(scope.form.expectedDisbursementDate, scope.df);

                    for (var i in scope.disbursementDetails) {
                        this.formData.disbursementData.push({
                            id: scope.disbursementDetails[i].id,
                            principal: scope.disbursementDetails[i].principal,
                            expectedDisbursementDate: dateFilter(scope.disbursementDetails[i].expectedDisbursementDate, scope.df),
                            loanChargeId: scope.disbursementDetails[i].loanChargeId
                        });
                    }
                    resourceFactory.LoanEditDisburseResource.update({
                        loanId: routeParams.id,
                        disbursementId: routeParams.disbursementId
                    }, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action === "adddisbursedetails" || scope.action === "deletedisbursedetails") {
                    this.formData.disbursementData = [];
                    for (var i in scope.disbursementDetails) {
                        this.formData.disbursementData.push({
                            id: scope.disbursementDetails[i].id,
                            principal: scope.disbursementDetails[i].principal,
                            expectedDisbursementDate: dateFilter(scope.disbursementDetails[i].expectedDisbursementDate, scope.df),
                            loanChargeId: scope.disbursementDetails[i].loanChargeId
                        });
                    }

                    this.formData.expectedDisbursementDate = dateFilter(scope.form.expectedDisbursementDate, scope.df);
                    resourceFactory.LoanAddTranchesResource.update({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "deleteloancharge") {
                    resourceFactory.LoanAccountResource.delete({
                        loanId: routeParams.id,
                        resourceType: 'charges',
                        chargeId: routeParams.chargeId
                    }, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "reviewapplication") {
                    resourceFactory.loanDecisionEngineResource.reviewApplication({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "rejectduediligence") {
                    resourceFactory.rejectDueDiligenceLoanDecisionEngineResource.rejectDueDiligence({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                }else if (scope.action == "rejectreviewapplication") {
                    resourceFactory.rejectLoanDecisionEngineResource.rejectReviewApplication({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                }else if (scope.action == "collateralreview") {
                    resourceFactory.collateralReviewLoanDecisionEngineResource.collateralReview({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "rejectcollateralreview") {
                    resourceFactory.rejectCollateralReviewLoanDecisionEngineResource.rejectCollateralReview({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "icreviewlevelone") {
                    resourceFactory.icReviewLevelOneLoanDecisionEngineResource.acceptIcReviewLevelOne({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "rejecticreviewlevelone") {
                    resourceFactory.rejectIcReviewLevelOneLoanDecisionEngineResource.rejectIcReviewLevelOne({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "icreviewleveltwo") {
                    resourceFactory.icReviewLevelTwoLoanDecisionEngineResource.acceptIcReviewLevelTwo({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "rejecticreviewleveltwo") {
                    resourceFactory.rejectIcReviewLevelTwoLoanDecisionEngineResource.rejectIcReviewLevelTwo({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "icreviewlevelthree") {
                    resourceFactory.icReviewLevelThreeLoanDecisionEngineResource.acceptIcReviewLevelThree({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "rejecticreviewlevelthree") {
                    resourceFactory.rejectIcReviewLevelThreeLoanDecisionEngineResource.rejectIcReviewLevelThree({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "icreviewlevelfour") {
                    resourceFactory.icReviewLevelFourLoanDecisionEngineResource.acceptIcReviewLevelFour({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "rejecticreviewlevelfour") {
                    resourceFactory.rejectIcReviewLevelFourLoanDecisionEngineResource.rejectIcReviewLevelFour({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "icreviewlevelfive") {
                    resourceFactory.icReviewLevelFiveLoanDecisionEngineResource.acceptIcReviewLevelFive({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "rejecticreviewlevelfive") {
                    resourceFactory.rejectIcReviewLevelFiveLoanDecisionEngineResource.rejectIcReviewLevelFive({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.isDynamicIcReviewLevel(scope.action)) {
                    // Dynamic IC Review Levels (6+) - Use dynamic endpoint
                    var levelNumber = scope.getIcReviewLevelNumber(scope.action);
                    var isReject = scope.action.startsWith('reject');

                    if (isReject) {
                        resourceFactory.rejectIcReviewDynamicLevelResource.reject({levelNumber: levelNumber, loanId: routeParams.id}, this.formData, function (data) {
                            location.path('/viewloanaccount/' + data.loanId);
                        });
                    } else {
                        resourceFactory.icReviewDynamicLevelResource.accept({levelNumber: levelNumber, loanId: routeParams.id}, this.formData, function (data) {
                            location.path('/viewloanaccount/' + data.loanId);
                        });
                    }
                } else if (scope.action == "prepareandsigncontract") {
                    resourceFactory.prepareAndSignContractLoanDecisionEngineResource.acceptPrepareAndSignContract({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else if (scope.action == "rejectprepareandsigncontract") {
                    resourceFactory.rejectPrepareAndSignContractLoanDecisionEngineResource.rejectPrepareAndSignContract({loanId: routeParams.id}, this.formData, function (data) {
                        location.path('/viewloanaccount/' + data.loanId);
                    });
                } else {
                    params.loanId = scope.accountId;
                    var allCharges = [];
                    if (scope.action == "disbursetosavings") {
                        var count = 0;
                        var increasedCount = 0;
                        var amount = 0;
                        var fundTransferData = {};
                        var actualDisbursementDateForTransaction = this.formData.actualDisbursementDate;
                        resourceFactory.LoanAccountResource.save(params, this.formData, function (data) {
                            resourceFactory.LoanAccountResource.getLoanAccountDetails({
                                    loanId: data.loanId, associations: 'all',
                                    exclude: 'guarantors,futureSchedule'
                                }, function (loanData) {
                                    console.log(loanData.charges);
                                    if (angular.isDefined(loanData.charges)) {
                                        for (let i = 0; i < loanData.charges.length; i++) {
                                            var charge = loanData.charges[i];
                                            if (charge.chargeTimeType.code == "chargeTimeType.disburseToSavings" && charge.amountPaid == 0) {
                                                amount = amount + charge.amount;
                                                fundTransferData = {
                                                    dateFormat: scope.df,
                                                    fromAccountId: loanData.linkedAccount.id,
                                                    fromAccountType: 2,
                                                    fromClientId: loanData.clientId,
                                                    fromOfficeId: data.officeId,
                                                    locale: scope.optlang.code,
                                                    toAccountId: loanData.id,
                                                    toAccountType: 1,
                                                    toClientId: loanData.clientId,
                                                    toOfficeId: data.officeId,
                                                    transferAmount: amount,
                                                    transferDate: actualDisbursementDateForTransaction,
                                                    transferDescription: "DisBurseToSavingsCharges"
                                                };
                                                count++;
                                            } else {
                                                location.path('/viewloanaccount/' + data.loanId);
                                            }
                                            console.log(fundTransferData, "fundtransfer");
                                        }
                                        fundTransferData.transferAmount = amount;
                                        resourceFactory.accountTransferResource.save(fundTransferData, function (accData) {
                                            if (count == loanData.charges.length) {
                                                location.path('/viewloanaccount/' + data.loanId);
                                            }
                                        });
                                    } else {
                                        location.path('/viewloanaccount/' + data.loanId);
                                    }
                                    ;
                                }
                            );
                        });
                    } else if (scope.action === "disbursementpreapprovalrequest" || scope.action === "approveDisbursement") {
                        const isApprove = scope.action === "approveDisbursement";

                        const chosenCommand = scope.isReject
                            ? scope.disburseCommands.rejectCommand
                            : scope.disburseCommands.command;

                        params.loanId = scope.accountId;
                        params.command = chosenCommand;

                        params.command = isApprove && scope.isCashPayment() ? 'disburse' : params.command;

                        scope.filterDisburseFormData();
                        this.formData.locale = scope.optlang.code;
                        this.formData.dateFormat = scope.df;

                        if (scope.isReject && scope.rejectReason) {
                            this.formData.rejectReason = scope.rejectReason;
                        }

                        resourceFactory.LoanAccountResource.save(params, this.formData, function (data) {
                            location.path('/viewloanaccount/' + data.loanId);
                        });
                    } else {
                        params.loanId = scope.accountId;
                        params.command = scope.isDisbursementPreApprovalRequest ? 'disbursementpreapprovalrequest' : params.command;
                        scope.filterDisburseFormData();
                        resourceFactory.LoanAccountResource.save(params, this.formData, function (data) {
                            location.path('/viewloanaccount/' + data.loanId);
                        });
                    }
                }
            };

            scope.submitDatatable = function () {
                if (scope.datatables) {
                    asyncLoop(Object.keys(scope.entityformData.datatables).length, function (loop) {
                        var cnt = loop.iteration();
                        var formData = scope.entityformData.datatables[cnt];
                        formData.registeredTableName = scope.datatables[cnt].registeredTableName;

                        var params = {
                            datatablename: formData.registeredTableName,
                            entityId: routeParams.id,
                            genericResultSet: 'true'
                        };

                        angular.extend(formData.data, {dateFormat: scope.df, locale: scope.optlang.code});

                        _.each(formData.data, function (columnHeader) {
                            if (columnHeader.dateType) {
                                columnHeader = dateFilter(columnHeader.dateType.date, params.dateFormat);
                            } else if (columnHeader.dateTimeType) {
                                columnHeader = dateFilter(columnHeader.columnName.date, scope.df) + " " + dateFilter(columnHeader.columnName.time, scope.tf);
                            }
                        });

                        var action = submitStatus[cnt];
                        resourceFactory.DataTablesResource[action](params, formData.data, function (data) {

                            submitStatus[cnt] = "update";
                            scope.submittedDatatables.push(scope.datatables[cnt].registeredTableName);
                            loop.next();

                        }, function () {
                            rootScope.errorDetails[0].push({datatable: scope.datatables[cnt].registeredTableName});
                            loop.break();
                        });

                    }, function () {
                        scope.submit();
                    });
                } else {
                    scope.submit();
                }
            };

            scope.$watch('formData.transactionDate', function () {
                scope.onDateChange();
            });


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


            scope.onDateChange = function () {
                if (scope.processDate) {
                    var params = {};
                    params.locale = scope.optlang.code;
                    params.dateFormat = scope.df;
                    params.transactionDate = dateFilter(this.formData.transactionDate, scope.df);
                    params.loanId = scope.accountId;
                    params.command = 'prepayLoan';
                    resourceFactory.loanTrxnsTemplateResource.get(params, function (data) {
                        scope.formData.transactionAmount = data.amount;
                        if (data.penaltyChargesPortion > 0) {
                            scope.showPenaltyPortionDisplay = true;
                        }
                        scope.principalPortion = data.principalPortion;
                        scope.interestPortion = data.interestPortion;
                    });
                }
            };

            scope.fetchClientOtherInfo = function (clientId) {
                resourceFactory.clientOtherInfoResource.getAll({clientId: clientId}, function (data) {
                    if (data.length > 0) {
                        scope.clientOtherInfoData = data[0];
                        scope.setPaymentRecipientInfo();
                    }
                });
            }

            scope.filterDisburseFormData = function () {
                const isCashPayment = scope.isCashPayment();
                if (!scope.isLoanDisbursementRequestEnabled || (isCashPayment && scope.isLoanDisbursementRequestEnabled)) {
                    delete scope.formData.clientPhoneNumber;
                    delete scope.formData.clientAccountNumber;
                    delete scope.formData.clientBankName;
                    delete scope.formData.beneficiaryName;
                    delete scope.formData.paymentTo;
                } else {
                    if (scope.isPaymentToClient()) {
                        scope.formData.clientPhoneNumber = scope.clientOtherInfoData.telephoneNumber;
                        scope.formData.clientAccountNumber = scope.clientOtherInfoData.bankAccountNumber;
                        scope.formData.clientBankName = scope.clientOtherInfoData.bankName;
                        delete scope.formData.beneficiaryName;
                    }
                }
            }

            scope.$watch('clientId', function() {
                if(scope.action === 'approve' && scope.clientId !== undefined) {
                    scope.fetchClientOtherInfo(scope.clientId);
                }

            });

            scope.$watch('formData.paymentTypeId', function () {
                if (scope.formData.paymentTypeId !== undefined) {
                    scope.showClientOtherInfoForm = scope.shouldShowPaymentRecipientInfo();
                    scope.setPaymentRecipientInfo();
                }
            });

            scope.$watch('formData.paymentTo', function () {
                if (scope.formData.paymentTo !== undefined) {
                    scope.setPaymentRecipientInfo();
                }
            });

            scope.isCashPayment = function () {
                if (!Array.isArray(scope.paymentTypes)) return false;

                const paymentTypeId = scope.formData?.paymentTypeId;

                return scope.paymentTypes
                    .find(pt => pt.id === paymentTypeId)
                    ?.isCashPayment || false;
            };

            scope.isPaymentToClient = function () {
                return scope.formData.paymentTo !== 2;
            };

            scope.isPaymentToSupplier = function () {
                return scope.formData.paymentTo === 2;
            };

            scope.shouldShowPaymentRecipientInfo = function () {
                const isNonCashPayment = !scope.isCashPayment();
                const isApprovalAction = scope.action === 'approve' || scope.action === 'disbursementpreapprovalrequest' || scope.action === 'approveDisbursement';
                return isApprovalAction && isNonCashPayment;
            };

            scope.isSupplierNonCashPayment = function () {
                return scope.shouldShowPaymentRecipientInfo() && scope.isPaymentToSupplier();
            };

            scope.setPaymentRecipientInfo = function () {
                if (!scope.shouldShowPaymentRecipientInfo()) {
                    return;
                }
                if (scope.isPaymentToClient()) {
                    scope.formData.clientPhoneNumber = scope.clientOtherInfoData.clientPhoneNumber || '';
                    scope.formData.clientAccountNumber = scope.clientOtherInfoData.bankAccountNumber || '';
                    scope.formData.clientBankName = scope.clientOtherInfoData.bankName || '';
                    scope.formData.beneficiaryName = '';
                } else {
                    scope.formData.clientPhoneNumber = scope.formData.clientPhoneNumber ||'';
                    scope.formData.clientAccountNumber = scope.formData.clientAccountNumber|| '';
                    scope.formData.clientBankName = scope.formData.clientBankName || '';
                    scope.formData.beneficiaryName = scope.formData.beneficiaryName || '';
                }
            };

            function icReviewLoanDecisionDataObjectToArray(icReviewData, currentLevelNumber) {
                if (!icReviewData) {
                    return [];
                }

                var levelWordByNumber = {
                    1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five',
                    6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten',
                    11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen',
                    16: 'Sixteen', 17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen', 20: 'Twenty'
                };

                var legacyFieldByLevel = {
                    1: 'icReviewDecisionLevelOneRecommendedAmount',
                    2: 'icReviewDecisionLevelTwoRecommendedAmount',
                    3: 'icReviewDecisionLevelThreeRecommendedAmount',
                    4: 'icReviewDecisionLevelFourRecommendedAmount',
                    5: 'icReviewDecisionLevelFiveRecommendedAmount'
                };

                var amountByLevel = {};
                var levelNumber;

                for (levelNumber = 1; levelNumber <= 5; levelNumber++) {
                    var legacyKey = legacyFieldByLevel[levelNumber];
                    if (legacyKey && icReviewData[legacyKey] != null) {
                        amountByLevel[levelNumber] = icReviewData[legacyKey];
                    }
                }

                if (icReviewData.decisionLevels && icReviewData.decisionLevels.length) {
                    icReviewData.decisionLevels.forEach(function (level) {
                        if (level && level.levelNumber && level.recommendedAmount != null
                                && level.decision === 'APPROVED') {
                            amountByLevel[level.levelNumber] = level.recommendedAmount;
                        }
                    });
                }

                var result = [];
                var maxLevel = currentLevelNumber || 999;

                Object.keys(amountByLevel).map(Number).sort(function (a, b) {
                    return a - b;
                }).forEach(function (levelNum) {
                    if (levelNum < maxLevel && levelWordByNumber[levelNum]) {
                        result.push({
                            label: 'icReviewDecisionLevel' + levelWordByNumber[levelNum] + 'RecommendedAmount',
                            value: amountByLevel[levelNum]
                        });
                    }
                });

                return result;
            }

            scope.rejectDisbursement = function () {
                var params = {loanId: scope.accountId, command: 'rejectDisbursement'};

                var confirmReject = confirm("Are you sure you want to reject this disbursement?");
                if (!confirmReject) {
                    return;
                }

                // Call backend API to reject disbursement and move back to awaiting approval
                resourceFactory.LoanAccountResource.save(params, {}, function (data) {
                    // Redirect to loan view after successful rejection
                    location.path('/viewloanaccount/' + data.loanId);
                });
            };

            scope.rejectICLevel = function () {
                // Check if this is a dynamic IC level (6+) - delegate to the proper function
                if (scope.isDynamicIcReviewLevel(scope.action)) {
                    scope.rejectDynamicICLevel();
                    return;
                }

                var params = {loanId: scope.accountId, command: 'reject'};

                var confirmReject = confirm("Are you sure you want to reject this loan level?");
                if (!confirmReject) {
                    return;
                }
                var payload = {
                    rejectedOnDate: dateFilter(scope.formData[scope.modelName],scope.df) || dateFilter(new Date(),scope.df),
                    dateFormat: scope.df,
                    locale: scope.optlang.code,
                    note: scope.formData.note

                };

                // Call backend API to reject disbursement and move back to awaiting approval
                resourceFactory.LoanAccountResource.save(params, payload, function (data) {
                    // Redirect to loan view after successful rejection
                    location.path('/viewloanaccount/' + data.loanId);
                });
            };

            // Reject function for dynamic IC Review Levels (6+)
            scope.rejectDynamicICLevel = function () {
                var levelNumber = scope.getIcReviewLevelNumber(scope.action);

                var confirmReject = confirm("Are you sure you want to reject this loan at IC Review Level " + levelNumber + "?");
                if (!confirmReject) {
                    return;
                }

                var payload = {
                    rejectedOnDate: dateFilter(scope.formData[scope.modelName], scope.df) || dateFilter(new Date(), scope.df),
                    dateFormat: scope.df,
                    locale: scope.optlang.code,
                    note: scope.formData.note
                };

                // Call backend API using command: 'reject' (same as levels 1-5)
                var params = {loanId: scope.accountId, command: 'reject'};
                resourceFactory.LoanAccountResource.save(params, payload, function (data) {
                    // Redirect to loan view after successful rejection
                    location.path('/viewloanaccount/' + data.loanId);
                });
            };

            scope.handleReject = function () {
                // Only validate the note field if it is shown and mandatory
                if (scope.showNoteField && scope.noteFieldMandatory && !scope.formData.note) {
                    scope.error = 'Note field is mandatory';
                    return; // Prevent submission if note is invalid
                }
                switch (scope.action) {
                    case 'disbursementpreapprovalrequest':
                    case 'approveDisbursement':
                        scope.rejectDisbursement();
                        break;
                    case 'icreviewlevelone':
                    case 'icreviewleveltwo':
                    case 'icreviewlevelthree':
                    case 'icreviewlevelfour':
                    case 'icreviewlevelfive':
                        scope.rejectICLevel();
                        break;
                    // Dynamic IC Review Levels (6+)
                    case 'icreviewlevelsix':
                    case 'icreviewlevelseven':
                    case 'icreviewleveleight':
                    case 'icreviewlevelnine':
                    case 'icreviewlevelten':
                    case 'icreviewleveleleven':
                    case 'icreviewleveltwelve':
                    case 'icreviewlevelthirteen':
                    case 'icreviewlevelfourteen':
                    case 'icreviewlevelfifteen':
                    case 'icreviewlevelsixteen':
                    case 'icreviewlevelseventeen':
                    case 'icreviewleveleighteen':
                    case 'icreviewlevelnineteen':
                    case 'icreviewleveltwenty':
                        scope.rejectDynamicICLevel();
                        break;
                    // add more cases as needed
                    default:
                        // fallback or error
                        break;
                }
            };



        }
    });
    mifosX.ng.application.controller('LoanAccountActionsController', ['$scope', '$rootScope', 'ResourceFactory', '$location', '$routeParams', 'dateFilter', mifosX.controllers.LoanAccountActionsController]).run(function ($log) {
        $log.info("LoanAccountActionsController initialized");
    });
}(mifosX.controllers || {}));
