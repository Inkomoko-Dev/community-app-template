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
                    '<tr ng-repeat-start="import in imports" ng-class="{\'bg-success\': import.completed && !import.failureCount, \'bg-danger\': import.completed && import.failureCount > 0, \'bg-warning\': !import.completed}">' +
                    '<td>{{import.name}}</td>' +
                    '<td>{{import.importTime | DateFormat}}</td>' +
                    '<td>{{import.endTime | DateFormat}}</td>' +
                    '<td>{{import.completed}}</td>' +
                    '<td>{{import.totalRecords}}</td>' +
                    '<td>{{import.successCount}}</td>' +
                    '<td>{{import.failureCount}}</td>' +
                    '<td ng-show="import.completed"><a href="" ng-click="downloadBulkImportOutput(import); $event.preventDefault()" has-permission="READ_DOCUMENT">' +
                    '<i class="fa fa-cloud-download"></i> ' +
                    '<span ng-if="import.failureCount > 0">{{ \'label.button.downloadresults\' | translate }}</span>' +
                    '</a></td>' +
                    '</tr>' +
                    '<tr ng-repeat-end ng-show="import.completed && import.failureCount > 0" class="bg-danger">' +
                    '<td colspan="8">' +
                    '<div ng-if="!import.failureMessages && !import.failureMessagesLoading">' +
                    '<span>{{ \'label.msg.bulkimport.failurereasonsinfile\' | translate:{count: import.failureCount} }}</span> ' +
                    '<a href="" ng-click="showBulkImportFailureReasons(import); $event.preventDefault()">{{ \'label.button.showfailurereasons\' | translate }}</a>' +
                    '</div>' +
                    '<div ng-if="import.failureMessagesLoading">{{ \'label.msg.bulkimport.loadingfailurereasons\' | translate }}</div>' +
                    '<div ng-if="import.failureMessages.length">{{ \'label.msg.bulkimport.statuscolumn\' | translate }}</div>' +
                    '<ul ng-if="import.failureMessages.length" class="list-unstyled" style="margin-bottom:0;">' +
                    '<li ng-repeat="failure in import.failureMessages"><strong>{{ \'label.msg.bulkimport.failurerowlabel\' | translate:{row: failure.row} }}</strong> <span ng-bind="failure.text"></span></li>' +
                    '</ul>' +
                    '<div ng-if="import.failureMessagesTruncated">{{ \'label.msg.bulkimport.morefailurereasons\' | translate:{shown: import.failureMessages.length, total: import.failureMessageTotal} }}</div>' +
                    '<div ng-if="import.failureMessagesParsed && !import.failureMessages.length">{{ \'label.msg.bulkimport.failurereasonsinfile\' | translate:{count: import.failureCount} }}</div>' +
                    '</td></tr>' +
                    '</tbody>'
            };
        }
    });
}(mifosX.directives || {}));

mifosX.ng.application.directive("bulkImportResults", [mifosX.directives.BulkImportResultsDirective]).run(function ($log) {
    $log.info("BulkImportResultsDirective initialized");
});
