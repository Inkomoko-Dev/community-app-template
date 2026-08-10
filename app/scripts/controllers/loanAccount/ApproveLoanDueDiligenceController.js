(function (module) {
    mifosX.controllers = _.extend(module, {
        ApproveLoanDueDiligenceController: function (scope, resourceFactory, routeParams, location, dateFilter) {

            scope.loandetails = [];
            scope.formData = {};
            scope.loanId = routeParams.id;
            scope.inparams = {resourceType: 'template', activeOnly: 'true'};
            scope.first = {};
            scope.first.startDate = new Date();
            scope.second = {};
            scope.second.endDate = new Date();
            scope.third = {};
            scope.third.dueDiligenceOn = new Date();
            scope.formData.isCrbVerificationRequired = true;

            resourceFactory.dueDiligenceLoanDecisionEngineResource.getTemplate({loanId: scope.loanId}, function (data) {
                scope.loandetails = data;
                scope.productId = data.loanProductId;
            });


            scope.cancel = function () {
                location.path('/viewloanaccount/' + scope.loanId);
            };

            scope.submit = function () {
                 this.formData.locale = scope.optlang.code;
                 this.formData.dateFormat = scope.df;

                 if (scope.third.dueDiligenceOn) {
                     this.formData.dueDiligenceOn = dateFilter(scope.third.dueDiligenceOn, scope.df);
                }


                resourceFactory.approveDueDiligenceLoanDecisionEngineResource.approveDueDiligence({loanId: scope.loanId},this.formData, function (data) {
                    location.path('/viewloanaccount/' + data.loanId );
                });
            };

        }
    });
    mifosX.ng.application.controller('ApproveLoanDueDiligenceController', ['$scope', 'ResourceFactory', '$routeParams', '$location','dateFilter','$routeParams', mifosX.controllers.ApproveLoanDueDiligenceController]).run(function ($log) {
        $log.info("ApproveLoanDueDiligenceController initialized");
    });
}(mifosX.controllers || {}));
