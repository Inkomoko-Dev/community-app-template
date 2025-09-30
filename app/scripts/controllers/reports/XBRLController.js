(function (module) {
    mifosX.controllers = _.extend(module, {
        DisbursementReportController: function ($scope, resourceFactory, $location) {
            $scope.pendingReports = [];

            resourceFactory.disbursementReportsResource.query({ status: 'PENDING' }, function (data) {
                console.log("Pending reports loaded: ", data);
                $scope.pendingReports = data;
            });

        
            $scope.newRequest = function () {
                $location.path('/reports/disbursement/new');
            };

            $scope.approve = function (report) {
                resourceFactory.disbursementReportsResource.update(
                    { id: report.id, action: 'approve' },
                    function () {
                        resourceFactory.disbursementReportsResource.query({ status: 'PENDING' }, function (data) {
                            $scope.pendingReports = data;
                        });
                    }
                );
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
