(function (module) {
    mifosX.directives = _.extend(module, {
        BulkImportResultsDirective: function () {
            return {
                restrict: 'A',
                link: function (scope) {
                    scope.showBulkImportFailureReasons = function (importDocument) {
                        scope.loadBulkImportFailureReasons(scope, importDocument, true);
                    };
                },
                template: '<thead>' +
                    '<tr class="graybg">' +
                    '<th>{{ \'label.heading.name\' | translate }}</th>' +
                    '<th>{{ \'label.heading.importtime\' | translate }}</th>' +
                    '<th>{{ \'label.heading.endtime\' | translate }}</th>' +
                    '<th>{{ \'label.heading.completed\' | translate }}</th>' +
                    '<th>{{ \'label.heading.totalrecords\' | translate }}</th>' +
                    '<th>{{ \'label.heading.successcount\' | translate }}</th>' +
                    '<th>{{ \'label.heading.failurecount\' | translate }}</th>' +
                    '<th>{{ \'label.button.download\' | translate }}</th>' +
                    '</tr></thead>' +
                    '<tbody>' +
                    '<tr ng-repeat-start="import in imports" ng-class="{\'bg-success\': import.completed, \'bg-danger\': !import.completed}">' +
                    '<td>{{import.name}}</td>' +
                    '<td>{{import.importTime | DateFormat}}</td>' +
                    '<td>{{import.endTime | DateFormat}}</td>' +
                    '<td>{{import.completed}}</td>' +
                    '<td>{{import.totalRecords}}</td>' +
                    '<td>{{import.successCount}}</td>' +
                    '<td>{{import.failureCount}}</td>' +
                    '<td ng-show="import.completed"><button type="button" class="btn btn-link" style="padding:0;" ng-click="downloadBulkImportOutput(import)" has-permission="READ_DOCUMENT">' +
                    '<i class="fa fa-cloud-download"></i>' +
                    '</button></td>' +
                    '</tr>' +
                    '<tr ng-repeat-end ng-show="!import.completed && import.failureMessage" class="bg-danger">' +
                    '<td colspan="8" style="white-space:pre-line;" ng-bind="import.failureMessage"></td></tr>' +
                    '</tbody>'
            };
        }
    });
}(mifosX.directives || {}));

mifosX.ng.application.directive("bulkImportResults", [mifosX.directives.BulkImportResultsDirective]).run(function ($log) {
    $log.info("BulkImportResultsDirective initialized");
});
