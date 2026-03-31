(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewLoanTransactionController: function (scope, resourceFactory, location, routeParams, dateFilter, $uibModal, $rootScope) {
            scope.details = [];
            scope.latestClosureDate = null;
            scope.relatedRecoveryReversal = null;
            //Get loan rates to be defined in transaction details
            scope.rates = $rootScope.rates;
            //Obtain total rate percentage
            scope.totalRatePercentage = 0;
            if (scope.rates){
              scope.rates.forEach(function (rate) {
                scope.totalRatePercentage += (rate.percentage/100);
              });
            }
            //get Tax from configuration
            scope.tax = 0;
            resourceFactory.configurationResource.get(function (data) {
                for (var i in data.globalConfiguration) {
                    if('vat-tax' === data.globalConfiguration[i].name){
                        scope.tax = (data.globalConfiguration[i].value/100);
                        break;
                    }
                }
              for (var i in data.globalConfiguration) {
                if('sub-rates' === data.globalConfiguration[i].name){
                  scope.ratesEnabled = (data.globalConfiguration[i].value);
                  break;
                }
              }
            });

            function normalizeDate(value) {
                if (!value) {
                    return null;
                }

                if (angular.isDate(value)) {
                    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
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

            function getLatestClosureDate(data) {
                var latestClosureDate = null;

                for (var i = 0; i < data.length; i++) {
                    var closureDate = normalizeDate(data[i].closingDate);
                    if (closureDate && (!latestClosureDate || closureDate.getTime() > latestClosureDate.getTime())) {
                        latestClosureDate = closureDate;
                    }
                }

                return latestClosureDate;
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

            function getTransactionTypeValue(transaction) {
                if (!transaction || !transaction.type) {
                    return '';
                }

                return ((transaction.type.code || '') + ' ' + (transaction.type.value || '')).toLowerCase();
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

                return normalizeDate(transactionRef.date || transactionRef.transactionDate || transactionRef.submittedOnDate);
            }

            function loadLatestClosureDate(officeId) {
                var params = {};
                if (officeId) {
                    params.officeId = officeId;
                }

                resourceFactory.accountingClosureResource.get(params, function (data) {
                    scope.latestClosureDate = getLatestClosureDate(data);
                }, function () {
                    scope.latestClosureDate = null;
                });
            }

            function loadRelatedRecoveryReversal(transaction) {
                scope.relatedRecoveryReversal = null;

                if (!scope.isRecoveryPaymentTransaction(transaction) || transaction.reversalTransaction === true || transaction.manuallyReversed !== true) {
                    return;
                }

                resourceFactory.LoanAccountResource.getLoanAccountDetails({
                    loanId: routeParams.accountId,
                    associations: 'all',
                    exclude: 'guarantors,futureSchedule'
                }, function (data) {
                    var recoveryReversalTransactionsByOriginalId = buildRecoveryReversalIndex(data.transactions || []);
                    scope.relatedRecoveryReversal = recoveryReversalTransactionsByOriginalId[extractTransactionId(transaction.id)] || null;
                }, function () {
                    scope.relatedRecoveryReversal = null;
                });
            }

            function loadTransaction() {
                resourceFactory.loanTrxnsResource.get({loanId: routeParams.accountId, transactionId: routeParams.id}, function (data) {
                    scope.transaction = data;
                    scope.transaction.accountId = routeParams.accountId;
                    scope.details = [];
                    scope.generateDetailTable();
                    loadLatestClosureDate(data.officeId);
                    loadRelatedRecoveryReversal(data);
                });
            }

            scope.isRecoveryPaymentTransaction = function (transaction) {
                var transactionTypeValue = getTransactionTypeValue(transaction);
                return !!(transaction && (transaction.isRecoveryPayment === true
                    || (transaction.type && transaction.type.recoveryRepayment === true)
                    || transactionTypeValue.indexOf('recovery') !== -1));
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

            scope.openRelatedTransaction = function (transactionRef) {
                var transactionId = extractTransactionId(transactionRef);
                if (!transactionId) {
                    return;
                }

                $rootScope.rates = scope.rates;
                location.path('/viewloantrxn/' + routeParams.accountId + '/trxnId/' + transactionId);
            };

            scope.getRelatedTransactionId = function (transactionRef) {
                return extractTransactionId(transactionRef);
            };

            scope.getRelatedTransactionDate = function (transactionRef) {
                return extractTransactionDate(transactionRef);
            };

            scope.openReverseRecoveryPaymentModal = function (transaction) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'views/loans/reverse_recovery_payment_modal.html',
                    controller: 'ReverseRecoveryPaymentModalController',
                    resolve: {
                        loanId: function () {
                            return transaction.accountId;
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
                    loadTransaction();
                });
            };

            scope.openPostCorrectedRecoveryPaymentModal = function (transaction) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'views/loans/post_corrected_recovery_payment_modal.html',
                    controller: 'PostCorrectedRecoveryPaymentModalController',
                    resolve: {
                        loanId: function () {
                            return transaction.accountId;
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
                    loadTransaction();
                });
            };

            loadTransaction();

            scope.undo = function (accountId, transactionId) {
                $uibModal.open({
                    templateUrl: 'undotransaction.html',
                    controller: UndoTransactionModel,
                    resolve: {
                        accountId: function () {
                          return accountId;
                        },
                        transactionId: function () {
                          return transactionId;
                        }
                    }
                });
            };
            
            var UndoTransactionModel = function ($scope, $uibModalInstance, accountId, transactionId) {
                $scope.note = ''; // Bind to textarea in the template
                $scope.undoTransaction = function () {
                    if (scope.transaction.type.id == 6) {
                        var params = { loanId: accountId, command: 'undowriteoff' };
                        resourceFactory.loanTrxnsResource.save(params, this.formData, function(data) {
                            $uibModalInstance.close('delete');
                            location.path('/viewloanaccount/' + data.loanId);
                        });
                    } else {
                        var params = {loanId: accountId, transactionId: transactionId, command: 'undo'};
                        var formData = {dateFormat: scope.df, locale: scope.optlang.code, transactionAmount: 0, note: $scope.note};
                        formData.transactionDate = dateFilter(new Date(), scope.df);
                        resourceFactory.loanTrxnsResource.save(params, formData, function (data) {
                            $uibModalInstance.close('delete');
                             if (data.loanId) {
                                location.path('/viewloanaccount/' + data.loanId);
                            }
                        });
                    }
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };
          scope.generateDetailTable = function () {
            //add principal amount
            var principalDetail = {
              description: 'label.view.principalpaymentdetail',
              containsAmount: true,
              boldTitle: true,
              align: 'left',
              amount: scope.transaction.principalPortion.toFixed(3)
            };
            scope.details.push(principalDetail);
            //Check for interest details

            var rateHeader = {
              description: 'label.view.interestspayment',
              containsAmount: scope.rates? false : true,
              boldTitle: true,
              amount: scope.rates? undefined : scope.transaction.interestPortion.toFixed(3)
            };
            scope.details.push(rateHeader);
            if (scope.ratesEnabled && scope.rates) {
              scope.rates.forEach(function (rate) {
                var rateDetail = {
                  description: rate.name,
                  containsAmount: true,
                  boldTitle: false,
                  amount: (((scope.transaction.interestPortion * (rate.percentage / 100)) / (scope.totalRatePercentage))
                      / (1 + (scope.tax ? scope.tax : 0))).toFixed(3)
                };
                scope.details.push(rateDetail);
                if (scope.tax) {
                  var rateTaxDetail = {
                    description: 'IVA',
                    containsAmount: true,
                    boldTitle: false,
                    amount: (rateDetail.amount * scope.tax).toFixed(3)
                  };
                  scope.details.push(rateTaxDetail);
                }
              });
              //Set total amount for rates
              var totalRateDetail = {
                description: 'label.view.interestspaymentTotal',
                containsAmount: true,
                boldTitle: true,
                isTotal: true,
                align: 'right',
                amount: scope.transaction.interestPortion.toFixed(3)
              };
              scope.details.push(totalRateDetail);
            }
            //Calculate total amount por charges
            scope.availableCharges = {};
            if (scope.transaction.loanChargePaidByList) {
              scope.transaction.loanChargePaidByList.forEach(function (data) {
                var chargePaidBy = {
                  id: data['id'],
                  amount: data['amount'],
                  type: data['name']
                };
                if (scope.availableCharges.hasOwnProperty(chargePaidBy.type)) {
                  scope.availableCharges[chargePaidBy.type] = (scope.availableCharges[chargePaidBy.type]
                      + chargePaidBy.amount);
                } else {
                  scope.availableCharges[chargePaidBy.type] = chargePaidBy.amount;
                }
              });
            }

            //Add charge header
            if (Object.keys(scope.availableCharges).length >= 1) {
              var chargeHeaderDetail = {
                description: 'label.input.charges',
                containsAmount: false,
                boldTitle: true
              };
              scope.details.push(chargeHeaderDetail);
            }

            for (var key in scope.availableCharges) {
              var chargeDetail = {
                description: key,
                containsAmount: true,
                boldTitle: false,
                amount: (scope.availableCharges[key].toFixed(3) / (1
                    + scope.tax ? scope.tax :0)).toFixed(3)
              };
              scope.details.push(chargeDetail);
              if (scope.tax) {
                var chargeTaxDetail = {
                  description: 'IVA',
                  containsAmount: true,
                  boldTitle: false,
                  amount: (chargeDetail.amount * scope.tax).toFixed(3)
                };
                scope.details.push(chargeTaxDetail);
              }
            }

            if (Object.keys(scope.availableCharges).length >= 1) {
              var chargeTotalDetail = {
                description: 'Total',
                containsAmount: true,
                boldTitle: true,
                align: 'right',
                amount: scope.transaction.penaltyChargesPortion.toFixed(3)
              };
              scope.details.push(chargeTotalDetail);
            }
          };
        }
    });
    mifosX.ng.application.controller('ViewLoanTransactionController', ['$scope', 'ResourceFactory', '$location', '$routeParams', 'dateFilter', '$uibModal', '$rootScope', mifosX.controllers.ViewLoanTransactionController]).run(function ($log) {
        $log.info("ViewLoanTransactionController initialized");
    });
}(mifosX.controllers || {}));
