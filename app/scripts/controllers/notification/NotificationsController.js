(function (module) {
    mifosX.controllers = _.extend(module, {
        NotificationsController: function (scope, resourceFactory, location, localStorageService) {
            var objTypeUrlMap = {
                'client' : '/viewclient/',
                'group' : '/viewgroup/',
                'loan' : '/viewloanaccount/',
                'shareAccount' : '/viewshareaccount/',
                'fixedDeposit' : 'viewfixeddepositaccount/',
                'recurringDepositAccount': '/viewrecurringdepositaccount/',
                'shareProduct': '/viewshareproduct/',
                'savingsAccount' : '/viewsavingaccount/',
                'center' : '/viewcenter/',
                'loanProduct' : '/viewloanproduct/'
            };
            scope.notifications = [];
            scope.notificationsPerPage = 15;
            scope.notificationsItmesInATray = 5;
            scope.isNotificationIconRed = false;
            scope.numberOfUnreadNotifications = 0;
            scope.initNotificationTray = function() {
                var readNotifications = localStorageService.getFromLocalStorage("notifications");
                if (readNotifications == null) {
                    scope.initNotificationsPage();
                } else {
                    scope.notifications = readNotifications;
                    scope.notifications = scope.translateObjectToReadableForm(scope.notifications);
                }
                if (scope.numberOfUnreadNotifications > 0 ) {
                    resourceFactory.notificationsResource.update();
                    scope.numberOfUnreadNotifications = 0;
                }
            };
            scope.initNotificationsPage = function () {
                var items = resourceFactory.notificationsResource.getAllNotifications({
                    offset: 0,
                    limit: scope.notificationsPerPage || 10
                }, function (data) {
                    scope.totalNotifications = data.totalFilteredRecords;
                    scope.notifications = data.pageItems;
                    scope.notifications = scope.translateObjectToReadableForm(scope.notifications);
                    localStorageService.addToLocalStorage("notifications", JSON.stringify(scope.notifications));
                });
            };
            scope.getResultsPage = function (pageNumber) {
                var items = resourceFactory.notificationsResource.getAllNotifications({
                    offset : ((pageNumber-1) * scope.notificationsPerPage),
                    limit: scope.notificationsPerPage
                }, function (data) {
                    scope.notifications = data.pageItems;
                    scope.notifications = scope.translateObjectToReadableForm(scope.notifications);
                });
            };
            scope.fetchUnreadNotifications = function() {
                var items = resourceFactory.notificationsResource.getAllUnreadNotifications({
                    offset: 0,
                    limit: scope.notificationsPerPage || 10
                }, function(data) {
                    scope.numberOfUnreadNotifications = data.pageItems.length;
                    var readNotifications = localStorageService.getFromLocalStorage("notifications");
                    if (readNotifications == null) {
                        scope.notifications = data.pageItems;
                    } else {
                        for (j = 0; j < data.pageItems.length; j++) {
                            for (i = 0; i < readNotifications.length; i++) {
                                if (JSON.stringify(readNotifications[i]) === JSON.stringify(data.pageItems[j])) {
                                    readNotifications.splice(i, 1);
                                }
                            }
                        }
                        scope.notifications = data.pageItems.concat
                        (readNotifications
                            .slice(0, Math.abs(readNotifications.length - data.pageItems.length + 1)));
                    }
                    scope.notifications = scope.translateObjectToReadableForm(scope.notifications);
                    localStorageService.addToLocalStorage("notifications", JSON.stringify(scope.notifications));
                });
             };
             scope.isJsonString = function(str) {
                try {
                    JSON.parse(str);
                } catch (e) {
                    return false;
                }
                return true;
            };
            scope.translateObjectToReadableForm = function(data) {
                scope.records = data.map(function(item) {
                if (scope.isJsonString(item.content)) {
                    // Parse the JSON content
                    if(item.objectType==='LoanRepaymentConfirmation'){
                    var parsedContent = "Repayment Made";
                    var parsedJson = JSON.parse(item.content);
                    var parentObjectId = parsedJson['loanId'];
                    // Merge the parsed content fields into the item object
                    return { ...item, content: parsedContent, objectId: parentObjectId, objectType: 'loan'};
                    }
                    return item;
                } else {
                    return item;
                }
            });
            return scope.records;
            };
            scope.navigateToAction = function(notification) {
                if(!notification.objectType || typeof(notification.objectType) !=='string'){
                    console.error('no object type found');
                    return;
                }
                if(!objTypeUrlMap[notification.objectType] ){
                    return;
                }
                
                location.path(objTypeUrlMap[notification.objectType] + notification.objectId);
            };
            scope.fetchItemsInNotificationTray = function() {
                  scope.initNotificationTray();
            };
            scope.$on("UserAuthenticationSuccessEvent", function (event, data) {
                localStorageService.removeFromLocalStorage("notifications"); //remove all local notifications
                scope.fetchUnreadNotifications();
            });
        }
    });
    mifosX.ng.application.controller('NotificationsController', ['$scope', 'ResourceFactory', '$location',
        'localStorageService', mifosX.controllers.NotificationsController])
        .run(function ($log) {
        $log.info("NotificationsController initialized");
    });
}(mifosX.controllers || {}));
