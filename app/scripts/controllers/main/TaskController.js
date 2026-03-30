(function (module) {
    mifosX.controllers = _.extend(module, {
        TaskController: function (scope, resourceFactory, route, dateFilter, $uibModal, location) {
            scope.clients = [];
            scope.loans = [];
            scope.offices = [];
            var idToNodeMap = {};
            scope.formData = {};
            scope.loanTemplate = {};
            scope.loanDisbursalTemplate = {};
            scope.disbursementApprovalSelected = {}; // id => true/false
            scope.disbursementApprovalTemplate = {}; // id => loan object
            scope.date = {};
            scope.checkData = [];
            scope.isCollapsed = true;
            scope.approveData = {};
            scope.restrictDate = new Date();
            //this value will be changed within each specific tab
            scope.requestIdentifier = "loanId";
            scope.isExtendLoanLifeCycleConfig = false;

            scope.itemsPerPage = 15;

            scope.loanRescheduleData = [];
            scope.checkForBulkLoanRescheduleApprovalData = [];
            scope.rescheduleData = function () {
                resourceFactory.loanRescheduleResource.getAll({command: 'pending'}, function (data) {
                    scope.loanRescheduleData = data;
                });
            };
            scope.rescheduleData();
            resourceFactory.configurationResourceByName.get({name: 'Add-More-Stages-To-A-Loan-Life-Cycle'}, function (data) {
                scope.isExtendLoanLifeCycleConfig = data.enabled;
            });

            // Fetch configured IC Review Levels from backend
            scope.configuredIcLevels = {};
            scope.activeIcReviewLevels = [];

            // Initialize empty data arrays for all possible IC Review Levels (1-10)
            // These will be populated only for configured levels
            var levelNames = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
            levelNames.forEach(function(name) {
                scope['loanPendingIcReviewLevel' + name + 'Data'] = [];
            });

            resourceFactory.getApprovalMatrixEngineTemplateResource.get(function (data) {
                if (data && data.activeIcReviewLevels) {
                    scope.activeIcReviewLevels = data.activeIcReviewLevels;

                    // Process each configured level from backend
                    data.activeIcReviewLevels.forEach(function(level) {
                        // Create a map for quick lookup
                        scope.configuredIcLevels[level.levelNumber] = level;

                        // Get level name from levelNumber (1 -> 'One', 2 -> 'Two', etc.)
                        var levelName = levelNames[level.levelNumber - 1];
                        if (!levelName) return;

                        var dataKey = 'loanPendingIcReviewLevel' + levelName + 'Data';

                        // Fetch pending loans for this level using state value from backend
                        var stateValue = level.stateValue || level.decisionState || level.loanDecisionState;
                        if (stateValue) {
                            resourceFactory.getAllLoansPendingDecisionEngineResource.getAll({
                                nextLoanDecisionState: String(stateValue)
                            }, function (loansData) {
                                scope[dataKey] = loansData;
                            });
                        }
                    });
                }
            });

            // Helper function to check if an IC level is configured
            scope.isIcLevelConfigured = function(levelNumber) {
                return scope.configuredIcLevels[levelNumber] !== undefined;
            };

            //Review Application
            scope.loanPendingReviewApplicationData = [];
            scope.getLoanPendingReviewApplication = function () {
                var nextLoanDecisionStateValue = '100'; //100 will be interpreted as null in Backend
                resourceFactory.getAllLoansPendingDecisionEngineResource.getAll({nextLoanDecisionState: nextLoanDecisionStateValue}, function (data) {
                    scope.loanPendingReviewApplicationData = data;
                });
            };
            scope.getLoanPendingReviewApplication();

            //Due Diligence
            scope.loanPendingDueDiligenceData = [];
            scope.getLoanPendingDueDiligence = function () {
                var nextLoanDecisionStateValue = '1000';
                resourceFactory.getAllLoansPendingDecisionEngineResource.getAll({nextLoanDecisionState: nextLoanDecisionStateValue}, function (data) {
                    scope.loanPendingDueDiligenceData = data;
                });
            };
            scope.getLoanPendingDueDiligence();

            //Prepare And Sign Contract
            scope.loanPendingPrepareAndSignContractData = [];
            scope.getLoanPendingPrepareAndSignContract = function () {
                var nextLoanDecisionStateValue = '1900';
                resourceFactory.getAllLoansPendingDecisionEngineResource.getAll({nextLoanDecisionState: nextLoanDecisionStateValue}, function (data) {
                    scope.loanPendingPrepareAndSignContractData = data;
                });
            };
            scope.getLoanPendingPrepareAndSignContract();


            resourceFactory.checkerInboxResource.get({templateResource: 'searchtemplate'}, function (data) {
                scope.checkerTemplate = data;
            });
            resourceFactory.checkerInboxResource.search(function (data) {
                scope.searchData = data;
            });
            scope.viewUser = function (item) {
                scope.userTypeahead = true;
                scope.formData.user = item.id;
            };

            // Toggle all checkboxes in a collection
            scope.toggleAllCheckboxes = function(collection, template) {
                const allChecked = scope.allCheckboxesMet(collection, template);
                angular.forEach(collection, function(item) {
                    template[item.id] = !allChecked;
                });
            };

            // Check if all checkboxes in a collection are checked
            scope.allCheckboxesMet = function(collection, template) {
                if (!collection) {return false;}
                return collection.every(item => template[item.id] === true);
            };

            // For loans awaiting approval (grouped by office)
            scope.loanApprovalAllCheckBoxesClicked = function(office) {
                if (!office || !office.loans) { return; }
                scope.toggleAllCheckboxes(office.loans, scope.loanTemplate);
            };

            scope.loanApprovalAllCheckBoxesMet = function(office) {
                if (!office || !office.loans) { return false; }
                return scope.allCheckboxesMet(office.loans, scope.loanTemplate);
            };

            // Helper function to get IC Review Level data by level name
            scope.getIcReviewLevelData = function(levelName) {
                return scope['loanPendingIcReviewLevel' + levelName + 'Data'] || [];
            };

            // For loan disbursal
            scope.loanDisbursalAllCheckBoxesClicked = function(office) {
                scope.toggleAllCheckboxes(office.awaitingDisbursalLoans, scope.loanDisbursalTemplate);
            };

            scope.loanDisbursalAllCheckBoxesMet = function(office) {
                return scope.allCheckboxesMet(office.awaitingDisbursalLoans, scope.loanDisbursalTemplate);
            };

            // For loan disbursement approval
            scope.disbursementApprovalAllCheckBoxesClicked = function(office) {
                scope.toggleAllCheckboxes(office.disbursementLoans, scope.disbursementApprovalSelected);
            };

            scope.disbursementApprovalAllCheckBoxesMet = function(office) {
                scope.allCheckboxesMet(office.disbursementLoans, scope.disbursementApprovalSelected);
            };

            // For client approvals
            scope.clientApprovalAllCheckBoxesClicked = function(officeName) {
                scope.toggleAllCheckboxes(scope.groupedClients[officeName], scope.approveData);
            };

            scope.clientApprovalAllCheckBoxesMet = function(officeName) {
                return scope.allCheckboxesMet(scope.groupedClients[officeName], scope.approveData);
            };

            // For checker inbox
            scope.checkerInboxAllCheckBoxesClicked = function() {
                scope.toggleAllCheckboxes(scope.searchData, scope.checkData);
            };

            scope.checkerInboxAllCheckBoxesMet = function() {
                return scope.allCheckboxesMet(scope.searchData, scope.checkData);
            };

            // For bulk loan reschedule
            scope.checkerInboxAllCheckBoxesClickedForBulkLoanRescheduleApproval = function() {
                scope.toggleAllCheckboxes(scope.loanRescheduleData, scope.checkForBulkLoanRescheduleApprovalData);
            };

            scope.checkerInboxAllCheckBoxesMetForBulkLoanRescheduleApproval = function() {
                return scope.allCheckboxesMet(scope.loanRescheduleData, scope.checkForBulkLoanRescheduleApprovalData);
            };



            scope.approveOrRejectChecker = function (action) {
                if (scope.checkData) {
                    $uibModal.open({
                        templateUrl: 'approvechecker.html',
                        controller: CheckerApproveCtrl,
                        resolve: {
                            action: function () {
                                return action;
                            }
                        }
                    });
                }
            };
            var CheckerApproveCtrl = function ($scope, $uibModalInstance, action) {
                $scope.action = action;
                $scope.note = '';
                $scope.approve = function () {
                    var totalApprove = 0;
                    var approveCount = 0;
                    _.each(scope.checkData, function (value, key) {
                        if (value == true) {
                            totalApprove++;
                        }
                    });
                    _.each(scope.checkData, function (value, key) {
                        if (value == true) {

                            resourceFactory.checkerInboxResource.save({
                                templateResource: key,
                                command: action
                            }, {note: $scope.note}, function (data) {
                                approveCount++;
                                if (approveCount == totalApprove) {
                                    scope.search();
                                }
                            }, function (data) {
                                approveCount++;
                                if (approveCount == totalApprove) {
                                    scope.search();
                                }
                            });
                        }
                    });
                    scope.checkData = {};
                    $uibModalInstance.close('approve');

                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            scope.deleteChecker = function () {
                if (scope.checkData) {
                    $uibModal.open({
                        templateUrl: 'deletechecker.html',
                        controller: CheckerDeleteCtrl
                    });
                }
            };
            var CheckerDeleteCtrl = function ($scope, $uibModalInstance) {
                $scope.delete = function () {
                    var totalDelete = 0;
                    var deleteCount = 0
                    _.each(scope.checkData, function (value, key) {
                        if (value == true) {
                            totalDelete++;
                        }
                    });
                    _.each(scope.checkData, function (value, key) {
                        if (value == true) {

                            resourceFactory.checkerInboxResource.delete({templateResource: key}, {}, function (data) {
                                deleteCount++;
                                if (deleteCount == totalDelete) {
                                    scope.search();
                                }
                            }, function (data) {
                                deleteCount++;
                                if (deleteCount == totalDelete) {
                                    scope.search();
                                }
                            });
                        }
                    });
                    scope.checkData = {};
                    $uibModalInstance.close('delete');
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            scope.approveClient = function () {
                if (scope.approveData) {
                    $uibModal.open({
                        templateUrl: 'approveclient.html',
                        controller: ApproveClientCtrl,
                        resolve: {
                            items: function () {
                                return scope.approveData;
                            }
                        }
                    });
                }
            };

            $('#mifos-reskin-ui-container').on('scroll', function () {
                if ($(this).scrollTop() > 100) {
                    $('.head-affix').css({
                        position: "fixed",
                        top: "50px",
                        width: "80%"
                    });

                } else {
                    $('.head-affix').css({
                        position: 'static',
                        width: "100%"
                    });
                }
            });

            var ApproveClientCtrl = function ($scope, $uibModalInstance, items) {
                $scope.restrictDate = new Date();
                $scope.date = {};
                $scope.date.actDate = new Date();
                $scope.approve = function (act) {
                    var activate = {}
                    activate.activationDate = dateFilter(act, scope.df);
                    activate.dateFormat = scope.df;
                    activate.locale = scope.optlang.code;
                    var totalClient = 0;
                    var clientCount = 0
                    _.each(items, function (value, key) {
                        if (value == true) {
                            totalClient++;
                        }
                    });

                    scope.batchRequests = [];
                    scope.requestIdentifier = "clientId";

                    var reqId = 1;
                    _.each(items, function (value, key) {
                        if (value == true) {
                            scope.batchRequests.push({
                                requestId: reqId++, relativeUrl: "clients/" + key + "?command=activate",
                                method: "POST", body: JSON.stringify(activate)
                            });
                        }
                    });

                    resourceFactory.batchResource.post(scope.batchRequests, function (data) {
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].statusCode = '200') {
                                clientCount++;
                                if (clientCount == totalClient) {
                                    route.reload();
                                }
                            }

                        }
                    });

                    scope.approveData = {};
                    $uibModalInstance.close('delete');
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            scope.routeTo = function (id) {
                location.path('viewcheckerinbox/' + id);
            };

            scope.routeToClient = function (id) {
                location.path('viewclient/' + id);
            };

            resourceFactory.officeResource.getAllOffices(function (data) {
                const idToNodeMap = {};
                scope.offices = data.map(office => {
                    office.loans = [];
                    office.awaitingDisbursalLoans = [];
                    office.disbursementLoans = [];
                    idToNodeMap[office.id] = office;
                    return office;
                });

                scope.loanResource = function () {
                    resourceFactory.loanResource.getAllLoans(
                        {
                            limit: '2000',
                            sqlSearch: 'l.loan_status_id in (100,200) OR l.loan_sub_status_id = 300'
                        },
                        function (loanData) {
                            const loans = loanData.pageItems;

                            // Reset office loan arrays
                            scope.offices.forEach(office => {
                                office.loans.length = 0;
                                office.awaitingDisbursalLoans.length = 0;
                                office.disbursementLoans.length = 0;
                            });

                            loans.forEach(loan => {
                                let office = null;

                                // Determine office from client or group
                                if (loan.clientOfficeId) {
                                    office = idToNodeMap[loan.clientOfficeId];
                                } else if (loan.group && loan.group.officeId) {
                                    office = idToNodeMap[loan.group.officeId];
                                }

                                if (!office) {return};

                                // Awaiting Disbursal: status 200, no substatus
                                if (loan.status.id === 200 && (!loan.subStatus || !loan.subStatus.id)) {
                                    office.awaitingDisbursalLoans.push(loan);
                                }

                                // Disbursement Approval: status 200, substatus 300
                                else if (loan.status.id === 200 && loan.subStatus && loan.subStatus.id === 300) {
                                    office.disbursementLoans.push(loan);
                                    scope.disbursementApprovalTemplate[loan.id] = loan;
                                }

                                // Pending Approval: status 100, optional
                                else if (loan.status.id === 100 && loan.loanDecisionState && loan.loanDecisionState.id === 1900) {
                                    office.loans.push(loan);
                                }
                            });

                            // Compute totals
                            scope.offices.forEach(office => {
                                office.totalLoanAmount = office.loans.reduce((sum, l) => sum + (l.principal || 0), 0);
                                office.totalAwaitingDisbursal = office.awaitingDisbursalLoans.reduce((sum, l) => sum + (l.principal || 0), 0);
                                office.totalDisbursementNet = office.disbursementLoans.reduce(
                                    (sum, l) => sum + (l.expectedNetDisbursalAmount || l.principal || 0), 0
                                );
                            });

                            // Compute grand total
                            scope.grandTotalDisbursementNet = scope.offices.reduce(
                                (sum, o) => sum + (o.totalDisbursementNet || 0), 0
                            );

                            // Keep only offices that have at least one loan
                            scope.offices = scope.offices.filter(o =>
                                (o.loans && o.loans.length) ||
                                (o.awaitingDisbursalLoans && o.awaitingDisbursalLoans.length) ||
                                (o.disbursementLoans && o.disbursementLoans.length)
                            );
                        }
                    );
                };

                scope.loanResource();
            });


            resourceFactory.clientResource.getAllClients({limit: 50, status: 'pending'}, function (data) {
                scope.groupedClients = _.groupBy(data.pageItems, "officeName");
            });

            scope.search = function () {
                scope.isCollapsed = true;
                var reqFromDate = dateFilter(scope.date.from, 'yyyy-MM-dd');
                var reqToDate = dateFilter(scope.date.to, 'yyyy-MM-dd');
                var params = {};
                if (scope.formData.action) {
                    params.actionName = scope.formData.action;
                }

                if (scope.formData.entity) {
                    params.entityName = scope.formData.entity;
                }

                if (scope.formData.resourceId) {
                    params.resourceId = scope.formData.resourceId;
                }

                if (scope.formData.user) {
                    params.makerId = scope.formData.user;
                }

                if (scope.date.from) {
                    params.makerDateTimeFrom = reqFromDate;
                }

                if (scope.date.to) {
                    params.makerDateTimeto = reqToDate;
                }
                resourceFactory.checkerInboxResource.search(params, function (data) {
                    scope.searchData = data;
                    if (scope.userTypeahead) {
                        scope.formData.user = '';
                        scope.userTypeahead = false;
                        scope.user = '';
                    }
                });
            };


            // ========================
            // 🔁 Generic Bulk Executor
            // ========================
            scope.bulkBatchExecutor = function ({
                                                    template,
                                                    command,
                                                    extraBody = {},
                                                    extraBodyBuilder = null,
                                                    successMessage,
                                                    failureMessage,
                                                    getUrl // optional function(loanId) => string
                                                }) {
                const selectedIds = Object.keys(template).filter(id => template[id]);
                if (selectedIds.length === 0) {
                    window.alert("No items selected for this action.");
                    return;
                }

                const batchRequests = selectedIds.map((id, i) => {
                    const loan = template[id];
                    let body = extraBodyBuilder ? extraBodyBuilder(loan) : extraBody || {};
                    return {
                        requestId: i + 1,
                        relativeUrl: getUrl ? getUrl(id) : `loans/${id}?command=${command}`,
                        method: "POST",
                        body: JSON.stringify(body)
                    };
                });

                resourceFactory.batchResource.post(
                    batchRequests,
                    function (responses) {
                        let successful = 0;
                        const failedItems = [];

                        _.each(responses, function (item) {
                            try {
                                const itemId = (() => {
                                    if (item.statusCode === 200) {
                                        const body = JSON.parse(item.body);
                                        template[body.loanId || body.resourceId] = false;
                                        successful++;
                                        return body.loanId || body.resourceId;
                                    } else {
                                        const matches = item.relativeUrl.match(/(\d+)/);
                                        return matches ? matches[1] : "unknown";
                                    }
                                })();

                                if (item.statusCode !== 200) {
                                    failedItems.push({ id: itemId, reason: item.body });
                                }
                            } catch (e) {
                                failedItems.push({ id: "unknown", reason: item.body || e.message });
                            }
                        });

                        if (successful > 0) { scope.loanResource(); }

                        let msg = `${successMessage || "Bulk operation complete."}\nSuccessful: ${successful}`;
                        if (failedItems.length > 0) {
                            msg += `\nFailed: ${failedItems.length}`;
                            failedItems.forEach(f => { msg += `\n  Item ${f.id}: ${f.reason}`; });
                        }

                        window.alert(msg);
                    },
                    function (error) {
                        console.error("Batch request failed:", error);
                        window.alert(`${failureMessage || "Batch request failed"}: ${JSON.stringify(error)}`);
                    }
                );
            };

            // ========================
            // 📝 Bulk Modal Controller
            // ========================
            var BulkActionModalCtrl = function ($scope, $uibModalInstance, config) {
                $scope.reason = '';

                $scope.cancel = () => $uibModalInstance.dismiss('cancel');

                $scope.confirm = () => {
                    if (config.requireReason && !$scope.reason.trim()) {
                        window.alert("Please provide a reason.");
                        return;
                    }

                    const extraBody = config.requireReason ? { note: $scope.reason } : config.extraBody || {};

                    scope.bulkBatchExecutor({
                        template: config.template,
                        command: config.command,
                        extraBody: extraBody,
                        extraBodyBuilder: config.extraBodyBuilder || null,
                        successMessage: config.successMessage,
                        failureMessage: config.failureMessage,
                        getUrl: config.getUrl
                    });

                    $uibModalInstance.close(config.actionName);
                };
            };

            // ========================
            // 🔔 Open Bulk Action Modal
            // ========================
            scope.openBulkActionModal = function (config) {
                if (!config.template) return;

                $uibModal.open({
                    templateUrl: config.templateUrl,
                    controller: BulkActionModalCtrl,
                    resolve: { config: () => config }
                });
            };

            // ========================
            // 💼 Bulk Actions
            // ========================

            // Bulk Loan Approval
            scope.approveLoan = () => scope.openBulkActionModal({
                actionName: "approveLoan",
                templateUrl: 'approveloan.html',
                template: scope.loanTemplate,
                command: 'approve',
                extraBody: { approvedOnDate: dateFilter(new Date(), scope.df) },
                successMessage: "Bulk loan approval completed.",
                failureMessage: "Bulk loan approval failed."
            });

            // Bulk Disbursement
            scope.disburseLoan = () => scope.openBulkActionModal({
                actionName: 'disburse',
                templateUrl: 'disburseloan.html',
                template: scope.loanDisbursalTemplate,
                command: 'disbursementpreapprovalrequest',
                extraBody: { actualDisbursementDate: dateFilter(new Date(), scope.df) },
                successMessage: 'Bulk disbursal completed.',
                failureMessage: 'Bulk disbursal failed.'
            });

            // Bulk Disbursement Approval
            scope.approveDisbursement = function () {
                const selectedLoanIds = Object.keys(scope.disbursementApprovalSelected)
                    .filter(id => scope.disbursementApprovalSelected[id]);

                if (!selectedLoanIds.length) return;

                const selectedLoans = {};
                selectedLoanIds.forEach(id => {
                    selectedLoans[id] = scope.disbursementApprovalTemplate[id];
                });

                scope.openBulkActionModal({
                    actionName: "disbursementApproval",
                    templateUrl: 'disbursementapproval.html',
                    template: selectedLoans, // only selected loans
                    command: "disbursementapproval",
                    extraBodyBuilder: function (loan) {
                        return {
                            actualDisbursementDate: dateFilter(new Date(), scope.df),
                            dateFormat: scope.df,
                            locale: scope.optlang.code,
                            note: loan.note || "",
                            externalId: loan.externalId || "",
                            resultCode: loan.resultCode || "",
                            paymentTypeId: loan.paymentType?.id || null,
                            accountNumber: loan.accountNumber || "",
                            checkNumber: loan.checkNumber || "",
                            routingCode: loan.routingCode || "",
                            receiptNumber: loan.receiptNumber || "",
                            bankNumber: loan.bankNumber || "",
                            transactionAmount: loan.principal || null,
                            postDatedChecks: null,
                            netDisbursalAmount: loan.expectedNetDisbursalAmount || loan.netDisbursalAmount || null
                        };
                    },
                    successMessage: "Bulk disbursement approval completed.",
                    failureMessage: "Bulk disbursement approval failed."
                });
            };

            scope.rejectPreDisbursement = () => scope.openBulkActionModal({
                actionName: 'disbursementRejection',
                templateUrl: 'disbursementrejection.html',
                template: scope.loanDisbursalTemplate,
                command: 'rejectDisbursement',
                requireReason: true,
                successMessage: "Bulk disbursement rejection completed.",
                failureMessage: "Bulk disbursement rejection failed."
            });


            // Bulk Disbursement Rejection
            scope.rejectDisbursement = () => scope.openBulkActionModal({
                actionName: 'disbursementRejection',
                templateUrl: 'disbursementrejection.html',
                template: scope.disbursementApprovalTemplate,
                command: 'rejectDisbursement',
                requireReason: true,
                successMessage: "Bulk disbursement rejection completed.",
                failureMessage: "Bulk disbursement rejection failed."
            });

// Bulk Loan Reschedule Approval (custom URL)
            scope.approveBulkLoanReschedule = () => scope.openBulkActionModal({
                actionName: "bulkLoanRescheduleApproval",
                templateUrl: 'loanreschedule.html',
                template: scope.checkForBulkLoanRescheduleApprovalData,
                command: 'approve',
                getUrl: id => `rescheduleloans/${id}?command=approve`,
                extraBody: { approvedOnDate: dateFilter(new Date(), scope.df) },
                successMessage: "Bulk loan reschedule approval completed.",
                failureMessage: "Bulk loan reschedule approval failed."
            });
        }
    });
    mifosX.ng.application.controller('TaskController', ['$scope', 'ResourceFactory', '$route', 'dateFilter', '$uibModal', '$location', mifosX.controllers.TaskController]).run(function ($log) {
        $log.info("TaskController initialized");
    });
}(mifosX.controllers || {}));
