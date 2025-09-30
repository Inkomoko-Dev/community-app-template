(function (module) {
    mifosX.controllers = _.extend(module, {
        DisbursementReportController: function ($scope, resourceFactory, $location) {
            $scope.activeTab = 'approved';
            $scope.pendingReports = [];
            $scope.approvedReports = [];
            $scope.rejectedReports = [];

            // Pending reports
            resourceFactory.disbursementReportsResource.query({ status: 'PENDING' }, function (data) {
                $scope.pendingReports = data;
            });

            // Approved reports
            resourceFactory.disbursementReportsResource.query({ status: 'APPROVED' }, function (data) {
                $scope.approvedReports = data;
            });


            // New report request → navigate to a new form screen
            $scope.newDisbursementReport = function () {
                console.log("Navigating to new request form");
                $location.path('/disbursement-request');
            };

            // Approve request
            $scope.approve = function (report) {
                resourceFactory.disbursementReportsApproveResource.approve(
                    { id: report.id },
                    {},
                    function () {
                        $scope.activeTab = 'approved';
                        $location.path('/disbursement-reports');
                    },
                    function (error) {
                        console.error("Error approving report:", error);
                    }
                );
            };

            $scope.view = function (report) {
                resourceFactory.disbursementReportsViewResource.view(
                    { id: report.id },
                    {},
                    function (data) {
                        console.log("Viewing report", data);
                        if (data.filePath) {
                            window.open(data.filePath, '_blank');
                        }
                    },
                    function (error) {
                        console.error("Error approving report:", error);
                    }
                );
            }

            $scope.viewPending = function (report) {
                $location.path('/disbursement-request/' + report.id);
            }

            $scope.toDate = function (arr) {
                if (!arr) return null;
                return new Date(arr[0], arr[1] - 1, arr[2], arr[3], arr[4], arr[5]);
            };


        }
    });

    mifosX.ng.application.controller(
        'DisbursementReportController',
        ['$scope', 'ResourceFactory', '$location', mifosX.controllers.DisbursementReportController]
    ).run(function ($log) {
        $log.info("DisbursementReportController initialized");
    });
}(mifosX.controllers || {}));
