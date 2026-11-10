/* Copyright (c) 2012-2013 Coding Smackdown TV, http://codingsmackdown.tv

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. */

'use strict';
// Declare module which depends on filters, and services
angular.module('notificationWidget', [])
// set up the interceptor
    .config(['$httpProvider', function ($httpProvider) {
        $httpProvider.interceptors.push(function ($q, $injector, $location, $rootScope) {
            var notificationChannel, $http;
            var savesInFlight = {};

            function releaseSave(config) {
                if (config && config.cbsWriteSignature) {
                    delete savesInFlight[config.cbsWriteSignature];
                }
            }

            function translateCode(code, params) {
                try {
                    var $translate = $injector.get('$translate');
                    var translated = $translate.instant(code, params || {});
                    if (!translated || translated === code) {
                        return null;
                    }
                    return translated;
                } catch (ignore) {
                    return null;
                }
            }

            function clearFieldMarkers() {
                if (typeof $ === 'undefined') {
                    return;
                }
                $('.api-field-error').remove();
                $(':input').removeClass('validationerror api-validation-error');
            }

            function clearDisplayedErrors() {
                $rootScope.errorStatus = null;
                $rootScope.errorDetails = [];
                $rootScope._apiInlineSignature = '';
                $rootScope._apiErrorRequestKey = null;
                clearFieldMarkers();
            }

            function publishErrors(parsed, config) {
                $rootScope.errorStatus = parsed.errorStatus || null;
                $rootScope.errorDetails = parsed.errorDetails || [];
                $rootScope._apiErrorRequestKey = config ? ApiErrorMessage.requestKey(config.method, config.url) : null;
                $rootScope._apiErrorGeneration = ($rootScope._apiErrorGeneration || 0) + 1;
                if (parsed.developerMessage || parsed.raw) {
                    console.error('API error', {
                        developerMessage: parsed.developerMessage || null,
                        body: parsed.raw
                    });
                }
            }

            function isBatchRequest(url) {
                return url && url.indexOf && url.indexOf('batches') > 0;
            }

            return {
                request: function (config) {
                    var signature = config ? ApiErrorMessage.writeSignature(config.method, config.url, config.params, config.data) : null;
                    if (signature && savesInFlight[signature]) {
                        return $q.defer().promise;
                    }
                    if (signature) {
                        savesInFlight[signature] = true;
                        config.cbsWriteSignature = signature;
                    }
                    $rootScope.blockUI = true;
                    if (ApiErrorMessage.shouldClearForRequest(config && config.method, config && config.url, $rootScope._apiErrorRequestKey)) {
                        clearDisplayedErrors();
                    }

                    // get requestNotificationChannel via $injector because of circular dependency problem
                    notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                    // send a notification requests are complete
                    notificationChannel.requestStarted();
                    // do something on success
                    return config || $q.when(config);
                },
                requestError: function (rejection) {
                    $rootScope.blockUI = false;
                    releaseSave(rejection && rejection.config);

                    // get $http via $injector because of circular dependency problem
                    $http = $http || $injector.get('$http');
                    // don't send notification until all requests are complete
                    if ($http.pendingRequests.length < 1) {
                        // get requestNotificationChannel via $injector because of circular dependency problem
                        notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                        // send a notification requests are complete
                        notificationChannel.requestEnded();
                    }
                    return $q.reject(rejection);
                },
                response: function (response) {
                    $rootScope.blockUI = false;
                    releaseSave(response && response.config);
                    var succeeded = response && response.config;
                    if (succeeded && ApiErrorMessage.shouldClearOnSuccess(succeeded.method, succeeded.url, $rootScope._apiErrorRequestKey)) {
                        clearDisplayedErrors();
                    }

                    //contains the responses successful and failed responses
                    $rootScope.successfulResponses = [];
                    $rootScope.failedResponses = [];

                    //check for batch API errors
                    if (isBatchRequest(response.config && response.config.url) && response.data && response.data.length) {
                        for (var i = 0; i < response.data.length; i++) {
                            var currResponse = response.data[i];
                            if (currResponse.statusCode == 200) {
                                $rootScope.successfulResponses.push(currResponse);
                            } else {
                                $rootScope.failedResponses.push(currResponse);
                            }
                        }

                        if ($rootScope.failedResponses.length > 0) {
                            publishErrors(ApiErrorMessage.parseBatchFailures($rootScope.failedResponses, translateCode), response.config);
                            return $q.reject(response);
                        }
                    }

                    // get $http via $injector because of circular dependency problem
                    $http = $http || $injector.get('$http');
                    // don't send notification until all requests are complete
                    if ($http.pendingRequests.length < 1) {
                        // get requestNotificationChannel via $injector because of circular dependency problem
                        notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                        // send a notification requests are complete
                        notificationChannel.requestEnded();
                    }
                    if (response.config && response.config.method == "GET") {
                        return response || $q.when(response);
                    } else {
                        if (response.data && response.data.commandId) {
                            //Maker checker is enabled or performing actions of maker checker
                            if (response.config.url.indexOf('makercheckers/') > 0) {
                                //return response for maker checker actions(approve or delete)
                                return response || $q.when(response);
                            } else {
                                //redirect if maker checker is enabled
                                try {
                                    var $uibModalStack = $injector.get('$uibModalStack');
                                    $uibModalStack.dismissAll('delete');  // closes all open modals
                                } catch (e) {
                                    console.warn('Could not dismiss modals', e);
                                }
                                $location.path('/viewMakerCheckerTask/' + response.data.commandId);
                            }
                        } else {
                            //when no maker checker enabled
                            return response || $q.when(response);
                        }
                    }
                },
                responseError: function (rejection) {
                    $rootScope.blockUI = false;
                    releaseSave(rejection && rejection.config);

                    // get $http via $injector because of circular dependency problem
                    $http = $http || $injector.get('$http');
                    // don't send notification until all requests are complete
                    if ($http.pendingRequests.length < 1) {
                        // get requestNotificationChannel via $injector because of circular dependency problem
                        notificationChannel = notificationChannel || $injector.get('requestNotificationChannel');
                        // send a notification requests are complete
                        notificationChannel.requestEnded();
                    }

                    var requestUrl = rejection && rejection.config ? rejection.config.url || '' : '';
                    if (rejection && rejection.config && rejection.config.ignoreErrorBanner) {
                        return $q.reject(rejection);
                    }
                    if (!ApiErrorMessage.shouldPublishError(rejection && rejection.config && rejection.config.method,
                            rejection && rejection.xhrStatus, $rootScope._apiErrorRequestKey)) {
                        return $q.reject(rejection);
                    }
                    var parsed;
                    if (isBatchRequest(requestUrl) && rejection && Object.prototype.toString.call(rejection.data) === '[object Array]') {
                        parsed = ApiErrorMessage.parseBatchFailures(rejection.data, translateCode);
                    } else {
                        var status = rejection ? rejection.status : 0;
                        parsed = ApiErrorMessage.parseHttpError(status, rejection ? rejection.data : null, translateCode);
                    }
                    publishErrors(parsed, rejection && rejection.config);
                    return $q.reject(rejection);
                }
            }
        })
    }])
    .run(['$rootScope', function ($rootScope) {
        function clearFieldMarkers() {
            if (typeof $ === 'undefined') {
                return;
            }
            $('.api-field-error').remove();
            $(':input').removeClass('validationerror api-validation-error');
        }

        $rootScope.dismissUserErrors = function () {
            $rootScope.errorStatus = null;
            $rootScope.errorDetails = [];
            $rootScope._apiInlineSignature = '';
            $rootScope._apiErrorRequestKey = null;
            clearFieldMarkers();
        };

        $rootScope.presentUserErrors = function (errors, status) {
            $rootScope.errorDetails = errors || [];
            $rootScope.errorStatus = status || null;
            $rootScope._apiErrorRequestKey = null;
            $rootScope._apiErrorGeneration = ($rootScope._apiErrorGeneration || 0) + 1;
        };

        $rootScope.$on('$routeChangeStart', function () {
            $rootScope.dismissUserErrors();
        });
    }])
    .directive('form', ['$injector', '$timeout', function ($injector, $timeout) {
        function hasPendingWrite($http) {
            for (var i = 0; i < $http.pendingRequests.length; i++) {
                var method = $http.pendingRequests[i].method;
                if (method && method !== 'GET') {
                    return true;
                }
            }
            return false;
        }

        function lockSubmitButtonsUntilSaved(element, $rootScope, $http) {
            var locked = [];
            angular.forEach(element[0].querySelectorAll('button[type="submit"], input[type="submit"]'), function (button) {
                if (!button.disabled) {
                    button.disabled = true;
                    button.setAttribute('aria-busy', 'true');
                    locked.push(button);
                }
            });
            if (!locked.length) {
                return;
            }
            var stopWatching = $rootScope.$watch(function () {
                return hasPendingWrite($http);
            }, function (pending) {
                if (pending) {
                    return;
                }
                stopWatching();
                angular.forEach(locked, function (button) {
                    button.disabled = false;
                    button.removeAttribute('aria-busy');
                });
            });
        }

        function lockWhenSaveStarts(element) {
            if (element.data('cbsAwaitingSave')) {
                return;
            }
            var $rootScope = $injector.get('$rootScope');
            var $http = $injector.get('$http');
            if (hasPendingWrite($http)) {
                lockSubmitButtonsUntilSaved(element, $rootScope, $http);
                return;
            }
            element.data('cbsAwaitingSave', true);
            var giveUp;
            var stopWatching = $rootScope.$watch(function () {
                return hasPendingWrite($http);
            }, function (pending) {
                if (!pending) {
                    return;
                }
                stopWatching();
                $timeout.cancel(giveUp);
                element.data('cbsAwaitingSave', false);
                lockSubmitButtonsUntilSaved(element, $rootScope, $http);
            });
            giveUp = $timeout(function () {
                stopWatching();
                element.data('cbsAwaitingSave', false);
            }, 2000, false);
        }

        return {
            restrict: 'E',
            require: 'form',
            link: function (scope, element, attrs, formCtrl) {
                element.on('click', function (event) {
                    var target = event.target && event.target.closest ? event.target.closest('button[type="submit"], input[type="submit"]') : null;
                    var prevented = event.isDefaultPrevented ? event.isDefaultPrevented() : event.defaultPrevented;
                    if (!target || !prevented) {
                        return;
                    }
                    lockWhenSaveStarts(element);
                });
                element.on('submit', function () {
                    lockWhenSaveStarts(element);
                    var $rootScope = $injector.get('$rootScope');
                    var generation = $rootScope._apiErrorGeneration || 0;
                    var hadClientError = !$rootScope._apiErrorRequestKey &&
                        ($rootScope.errorStatus || ($rootScope.errorDetails && $rootScope.errorDetails.length));
                    $timeout(function () {
                        var $http = $injector.get('$http');
                        var pendingWrite = hasPendingWrite($http);
                        var stillSame = ($rootScope._apiErrorGeneration || 0) === generation;
                        if (hadClientError && stillSame && (pendingWrite || !formCtrl.$invalid)) {
                            if ($rootScope.dismissUserErrors) {
                                $rootScope.dismissUserErrors();
                            }
                            return;
                        }
                        if (!formCtrl.$invalid || pendingWrite) {
                            return;
                        }
                        if ($rootScope.errorStatus || ($rootScope.errorDetails && $rootScope.errorDetails.length)) {
                            return;
                        }
                        var seen = {};
                        var errors = [];
                        element.find('.ng-invalid').each(function () {
                            var field = this.getAttribute('name') || this.getAttribute('id');
                            if (!field || seen[field] || field === formCtrl.$name) {
                                return;
                            }
                            seen[field] = true;
                            var required = this.hasAttribute('required') || (this.className || '').indexOf('ng-invalid-required') !== -1;
                            var label = ApiErrorMessage.humanizeField(field);
                            errors.push({
                                field: field,
                                code: required ? 'error.msg.field.required' : 'error.msg.field.invalid',
                                args: {params: [{value: label}]}
                            });
                        });
                        if (errors.length) {
                            $rootScope.presentUserErrors(errors, null);
                        }
                    });
                });
            }
        };
    }])
    // declare the notification pub/sub channel
    .factory('requestNotificationChannel', ['$rootScope', function ($rootScope) {
        // private notification messages
        var _START_REQUEST_ = '_START_REQUEST_';
        var _END_REQUEST_ = '_END_REQUEST_';
        // publish start request notification
        var requestStarted = function () {
            $rootScope.$broadcast(_START_REQUEST_);
        };
        // publish end request notification
        var requestEnded = function () {
            $rootScope.$broadcast(_END_REQUEST_);
        };
        // subscribe to start request notification
        var onRequestStarted = function ($scope, handler) {
            $scope.$on(_START_REQUEST_, function (event) {
                handler();
            });
        };
        // subscribe to end request notification
        var onRequestEnded = function ($scope, handler) {
            $scope.$on(_END_REQUEST_, function (event) {
                handler();
            });
        };
        return {
            requestStarted: requestStarted,
            requestEnded: requestEnded,
            onRequestStarted: onRequestStarted,
            onRequestEnded: onRequestEnded
        };
    }]);
