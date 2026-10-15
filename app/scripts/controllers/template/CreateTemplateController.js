/*global mifosX _  CKEDITOR */
(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateTemplateController: function (scope, resourceFactory, location, $rootScope, $timeout) {
            scope.mappers = [];
            scope.formData = {};
            resourceFactory.templateResource.getTemplateDetails({resourceType: 'template'}, function (data) {
                scope.template = data;
                scope.advanceOption = 'false';
                scope.oneAtATime = 'true';
                scope.formData.entity = data.entities[0].id;
                scope.formData.type = data.types[0].id;
                scope.templateKeyEntity = "Client";
                scope.clientKeys();
                scope.loanKeys();
                scope.savingsAccountKeys();
                scope.groupKeys();
                scope.mappers.push({
                    mappersorder: 0,
                    mapperskey: "client",
                    mappersvalue: "clients/{{clientId}}?tenantIdentifier=" + $rootScope.tenantIdentifier,
                    defaultAddIcon: 'true'
                });
            });

            scope.editorInstance = function () {
                return (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances) ? CKEDITOR.instances.templateeditor : null;
            };

            scope.editorText = function () {
                var editor = scope.editorInstance();
                return editor ? editor.getData() : (scope.formData.text || '');
            };

            scope.setEditorText = function (value) {
                var editor = scope.editorInstance();
                if (editor) {
                    editor.setData(value);
                } else {
                    scope.formData.text = value;
                }
            };

            scope.insertEditorText = function (value) {
                var editor = scope.editorInstance();
                if (editor) {
                    editor.insertText(value);
                } else {
                    scope.formData.text = (scope.formData.text || '') + value;
                }
            };

            scope.clientKeys = function () {
                scope.clientTemplateKeys = ["{{client.id}}", "{{client.accountNo}}", "{{client.externalId}}", "{{client.status.value}}",
                    "{{client.activationDate}}", "{{client.officeName}}", "{{client.staffName}}", "{{client.firstname}}", "{{client.middlename}}",
                    "{{client.lastname}}", "{{client.displayName}}", "{{client.mobileNo}}", "{{client.emailAddress}}", "{{client.dateOfBirth}}",
                    "{{client.gender.name}}", "{{client.clientType.name}}", "{{client.clientClassification.name}}", "{{client.legalForm.value}}",
                    "{{client.timeline.submittedOnDate}}", "{{client.timeline.activatedOnDate}}", "{{client.timeline.activatedByUsername}}",
                    "{{client.clientAdditionalInfoData.altMobileNo}}", "{{client.clientAdditionalInfoData.title}}"];
                                        scope.additionalInfo = ["{{activity}}","{{time}}","{{clientId}}","{{loanId}}", "{{bvn}}","{{resourceId}}"];
                scope.templateEntity = [
                    {"entityName": "Client",
                        "templateKeys": scope.clientTemplateKeys
                    },                    {
                        "entityName": "SavingsAccount",
                        "templateKeys": scope.savingsAccountTemplateKeys
                    },
                    {
                        "entityName": "Loan",
                        "templateKeys": scope.loanTemplateKeys
                    },
                    {
                        "entityName": "Repayment Schedule",
                        "templateKeys": scope.repaymentTemplateKeys
                    },
                    {
                        "entityName": "Disbursement",
                        "templateKeys": scope.disbursementTemplateKeys
                    },
                    {
                        "entityName": "Penalties and Charges",
                        "templateKeys": scope.chargesTemplateKeys
                    },
                    {
                        "entityName": "Loan Product",
                        "templateKeys": scope.loanProductTemplateKeys
                    },
                    {
                        "entityName": "Loan Summary",
                        "templateKeys": scope.loanSummaryTemplateKeys
                    },
                    {
                        "entityName": "Group",
                        "templateKeys": scope.groupTemplateKeys
                    },
                    {"entityName": "Additional Info",
                        "templateKeys": scope.additionalInfo
                    }
                ];
                scope.setEditorText('');
            };

            scope.loanKeys = function () {
                //scope.setEditorText('');
                scope.loanProductTemplateKeys = [
                        "{{loan.loanProductId}}",
                        "{{loan.loanProductName}}",
                        "{{loan.loanProductDescription}}",
                        "{{loan.transactionProcessingStrategyName}}"
                    ];
                scope.loanTemplateKeys = [
                        "{{loan.accountNo}}",
                        "{{loan.externalId}}",
                        "{{loan.clientName}}",
                        "{{loan.clientAccountNo}}",
                        "{{loan.loanProductName}}",
                        "{{loan.loanOfficerName}}",
                        "{{loan.loanPurposeName}}",
                        {label: "Loan cycle", value: "{{loan.loanCounter}}"},
                        {label: "Product cycle", value: "{{loan.loanProductCounter}}"},
                        "{{loan.fundName}}",
                        "{{loan.department.name}}",
                        "{{loan.status.value}}",
                        "{{loan.loanType.value}}",
                        "{{loan.currency.code}}",
                        "{{loan.currency.name}}",
                        "{{loan.principal}}",
                        "{{loan.proposedPrincipal}}",
                        "{{loan.approvedPrincipal}}",
                        "{{loan.netDisbursalAmount}}",
                        "{{loan.annualInterestRate}}",
                        "{{loan.interestRatePerPeriod}}",
                        "{{loan.interestRateFrequencyType.value}}",
                        "{{loan.interestType.value}}",
                        "{{loan.amortizationType.value}}",
                        "{{loan.interestCalculationPeriodType.value}}",
                        "{{loan.termFrequency}}",
                        "{{loan.termPeriodFrequencyType.value}}",
                        "{{loan.numberOfRepayments}}",
                        "{{loan.repaymentEvery}}",
                        "{{loan.repaymentFrequencyType.value}}",
                        "{{loan.inArrears}}",
                        "{{loan.timeline.submittedOnDate}}",
                        "{{loan.timeline.submittedByFirstname}}",
                        "{{loan.timeline.submittedByLastname}}",
                        "{{loan.timeline.approvedOnDate}}",
                        "{{loan.timeline.approvedByFirstname}}",
                        "{{loan.timeline.approvedByLastname}}",
                        "{{loan.timeline.expectedDisbursementDate}}",
                        "{{loan.timeline.actualDisbursementDate}}",
                        "{{loan.timeline.disbursedByFirstname}}",
                        "{{loan.timeline.disbursedByLastname}}",
                        "{{loan.timeline.expectedMaturityDate}}",
                        "{{loan.timeline.closedOnDate}}"
                    ];
                scope.repaymentTemplateKeys = ["{{loan.repaymentSchedule.loanTermInDays}}", "{{loan.repaymentSchedule.totalPrincipalDisbursed}}",
                    "{{loan.repaymentSchedule.totalPrincipalExpected}}", "{{loan.repaymentSchedule.totalPrincipalPaid}}",
                    "{{loan.repaymentSchedule.totalInterestCharged}}", "{{loan.repaymentSchedule.totalFeeChargesCharged}}",
                    "{{loan.repaymentSchedule.totalPenaltyChargesCharged}}", "{{loan.repaymentSchedule.totalWaived}}",
                    "{{loan.repaymentSchedule.totalWrittenOff}}", "{{loan.repaymentSchedule.totalRepaymentExpected}}",
                    "{{loan.repaymentSchedule.totalRepayment}}", "{{loan.repaymentSchedule.totalPaidInAdvance}}",
                    "{{loan.repaymentSchedule.totalPaidLate}}", "{{loan.repaymentSchedule.totalOutstanding}}",
                    {label: "First repayment date", value: "{{loan.repaymentSchedule.periods#1.dueDate}}"},
                    {label: "First instalment amount", value: "{{loan.repaymentSchedule.periods#1.totalDueForPeriod}}"},
                    {label: "Schedule table, one row per instalment", html: '<table border="1" cellpadding="4"><tbody><tr><th>Installment</th><th>Due Date</th><th>Principal</th><th>Interest</th><th>Fees</th><th>Total Due</th></tr><tr><td>{{#loan.repaymentSchedule.periods}}{{#period}}{{period}}</td><td>{{dueDate}}</td><td>{{principalDue}}</td><td>{{interestDue}}</td><td>{{feeChargesDue}}</td><td>{{totalDueForPeriod}}</td></tr><tr><td>{{/period}}{{/loan.repaymentSchedule.periods}}</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>'}];
                scope.disbursementTemplateKeys = [
                    {label: "Disbursement method", value: "{{#loan.disbursementDetails}}{{paymentTypeName}}{{/loan.disbursementDetails}}"},
                    {label: "Bank name", value: "{{#loan.disbursementDetails}}{{clientBankName}}{{/loan.disbursementDetails}}"},
                    {label: "Account number", value: "{{#loan.disbursementDetails}}{{clientAccountNumber}}{{/loan.disbursementDetails}}"},
                    {label: "Mobile number", value: "{{#loan.disbursementDetails}}{{clientPhoneNumber}}{{/loan.disbursementDetails}}"},
                    {label: "Beneficiary name", value: "{{#loan.disbursementDetails}}{{beneficiaryName}}{{/loan.disbursementDetails}}"},
                    {label: "Expected disbursement date", value: "{{#loan.disbursementDetails}}{{expectedDisbursementDate}}{{/loan.disbursementDetails}}"},
                    {label: "Actual disbursement date", value: "{{#loan.disbursementDetails}}{{actualDisbursementDate}}{{/loan.disbursementDetails}}"},
                    {label: "Disbursed amount", value: "{{#loan.disbursementDetails}}{{principal}}{{/loan.disbursementDetails}}"}
                ];
                scope.chargesTemplateKeys = [
                    {label: "Penalty name", value: "{{#loan.overdueCharges}}{{name}}{{/loan.overdueCharges}}"},
                    {label: "Penalty rate or amount", value: "{{#loan.overdueCharges}}{{amount}}{{/loan.overdueCharges}}"},
                    {label: "Penalty calculation method", value: "{{#loan.overdueCharges}}{{chargeCalculationType.value}}{{/loan.overdueCharges}}"},
                    {label: "All penalties", value: "{{#loan.overdueCharges}}{{name}}: {{amount}} ({{chargeCalculationType.value}}) {{/loan.overdueCharges}}"},
                    {label: "All loan charges", value: "{{#loan.charges}}{{name}}: {{amount}} ({{chargeCalculationType.value}}) {{/loan.charges}}"}
                ];
                scope.loanSummaryTemplateKeys = [
                        "{{loan.summary.principalDisbursed}}",
                        "{{loan.summary.principalPaid}}",
                        "{{loan.summary.principalWrittenOff}}",
                        "{{loan.summary.principalOutstanding}}",
                        "{{loan.summary.principalOverdue}}",
                        "{{loan.summary.interestCharged}}",
                        "{{loan.summary.interestPaid}}",
                        "{{loan.summary.interestWaived}}",
                        "{{loan.summary.interestWrittenOff}}",
                        "{{loan.summary.interestOutstanding}}",
                        "{{loan.summary.interestOverdue}}",
                        "{{loan.summary.feeChargesCharged}}",
                        "{{loan.summary.feeChargesDueAtDisbursementCharged}}",
                        "{{loan.summary.feeChargesPaid}}",
                        "{{loan.summary.feeChargesWaived}}",
                        "{{loan.summary.feeChargesWrittenOff}}",
                        "{{loan.summary.feeChargesOutstanding}}",
                        "{{loan.summary.feeChargesOverdue}}",
                        "{{loan.summary.penaltyChargesCharged}}",
                        "{{loan.summary.penaltyChargesPaid}}",
                        "{{loan.summary.penaltyChargesWaived}}",
                        "{{loan.summary.penaltyChargesWrittenOff}}",
                        "{{loan.summary.penaltyChargesOutstanding}}",
                        "{{loan.summary.penaltyChargesOverdue}}",
                        "{{loan.summary.totalExpectedRepayment}}",
                        "{{loan.summary.totalRepayment}}",
                        "{{loan.summary.totalExpectedCostOfLoan}}",
                        "{{loan.summary.totalCostOfLoan}}",
                        "{{loan.summary.totalWaived}}",
                        "{{loan.summary.totalWrittenOff}}",
                        "{{loan.summary.totalOutstanding}}",
                        "{{loan.summary.totalOverdue}}"
                    ];
                scope.templateEntity = [
                    {"entityName": "Loan",
                        "templateKeys": scope.loanTemplateKeys
                    },
                    {"entityName": "Repayment Schedule",
                        "templateKeys": scope.repaymentTemplateKeys
                    },
                    {"entityName": "Disbursement",
                        "templateKeys": scope.disbursementTemplateKeys
                    },
                    {"entityName": "Penalties and Charges",
                        "templateKeys": scope.chargesTemplateKeys
                    },
                    {"entityName": "Loan Product",
                        "templateKeys": scope.loanProductTemplateKeys
                    },
                    {"entityName": "Loan Summary",
                        "templateKeys": scope.loanSummaryTemplateKeys
                    },
                    {
                        "entityName": "Savings Account",
                        "templateKeys": scope.savingsAccountTemplateKeys
                    },
                    {"entityName": "Client",
                    "templateKeys": scope.clientTemplateKeys
                    },
                    {
                        "entityName": "Group",
                        "templateKeys": scope.groupTemplateKeys
                    },
                    {"entityName": "Additional Info",
                        "templateKeys": scope.additionalInfo
                    }
                ];
                scope.setEditorText('');
            };

            scope.savingsAccountKeys = function () {
                scope.savingsAccountTemplateKeys = ["{{savingsAccount.id}}",
                "{{savingsAccount.client.id}}",
                "{{savingsAccount.accountNumber}}",
                "{{savingsAccount.externalId}}",
                "{{savingsAccount.product.name}}",
                "{{savingsAccount.product.id}}",
                "{{savingsAccount.savingsOfficer}}",
                "{{savingsAccount.status}}",
                "{{savingsAccount.sub_status}}",
                "{{savingsAccount.accountType}}",
                "{{savingsAccount.submittedOnDate}}",
                "{{savingsAccount.rejectedOnDate}}",
                "{{savingsAccount.withdrawnOnDate}}",
                "{{savingsAccount.withdrawnBy}}",
                "{{savingsAccount.approvedOnDate}}",
                "{{savingsAccount.activatedOnDate}}",
                "{{savingsAccount.activatedBy}}",
                "{{savingsAccount.closedOnDate}}",
                "{{savingsAccount.closedBy}}",
                "{{savingsAccount.reasonForBlock}}",
                "{{savingsAccount.currency}}",
                "{{savingsAccount.nominalAnnualInterestRate}}",
                "{{savingsAccount.interestCompoundingPeriodType}}",
                "{{savingsAccount.interestPostingPeriodType}}",
                "{{savingsAccount.interestCalculationType}}",
                "{{savingsAccount.interestCalculationDaysInYearType}}",
                "{{savingsAccount.minRequiredOpeningBalance}}",
                "{{savingsAccount.lockinPeriodFrequency}}",
                "{{savingsAccount.lockinPeriodFrequencyType}}",
                "{{savingsAccount.lockedInUntilDate}}",
                "{{savingsAccount.withdrawalFeeApplicableForTransfer}}",
                "{{savingsAccount.allowOverdraft}}",
                "{{savingsAccount.overdraftLimit}}",
                "{{savingsAccount.nominalAnnualInterestRateOverdraft}}",
                "{{savingsAccount.minOverdraftForInterestCalculation}}",
                "{{savingsAccount.postOverdraftInterestOnDeposit}}",
                "{{savingsAccount.enforceMinRequiredBalance}}",
                "{{savingsAccount.minRequiredBalance}}",
                "{{savingsAccount.lienAllowed}}",
                "{{savingsAccount.maxAllowedLienLimit}}",
                "{{savingsAccount.onHoldFunds}}",
                "{{savingsAccount.startInterestCalculationDate}}",
                "{{savingsAccount.summary}}"
                ];

                scope.templateEntity = [
                    {
                        "entityName": "Savings Account",
                        "templateKeys": scope.savingsAccountTemplateKeys},
                    {
                        "entityName": "Loan",
                        "templateKeys": scope.loanTemplateKeys
                    },
                    {
                        "entityName": "Repayment Schedule",
                        "templateKeys": scope.repaymentTemplateKeys
                    },
                    {
                        "entityName": "Disbursement",
                        "templateKeys": scope.disbursementTemplateKeys
                    },
                    {
                        "entityName": "Penalties and Charges",
                        "templateKeys": scope.chargesTemplateKeys
                    },
                    {
                        "entityName": "Loan Product",
                        "templateKeys": scope.loanProductTemplateKeys
                    },
                    {
                        "entityName": "Loan Summary",
                        "templateKeys": scope.loanSummaryTemplateKeys
                    },
                    {
                        "entityName": "Client",
                        "templateKeys": scope.clientTemplateKeys
                    },
                    {
                        "entityName": "Group",
                        "templateKeys": scope.groupTemplateKeys
                    },
                    {
                        "entityName": "Additional Info",
                        "templateKeys": scope.additionalInfo
                    }
                ];
                scope.setEditorText('');
            };

            scope.groupKeys = function () {
                scope.groupTemplateKeys = ["{{group.id}}",
                "{{group.name}}",
                "{{group.accountNumber}}",
                "{{group.externalId}}",
                "{{group.status}}",
                "{{group.activationDate}}",
                "{{group.office}}",
                "{{group.office.id}}",
                "{{group.staff}}",
                "{{group.staff.id}}",
                "{{group.parent}}",
                "{{group.parent.id}}",
                "{{group.groupLevel}}",
                "{{group.groupLevel.id}}",
                "{{group.hierarchy}}",
                "{{group.submittedOnDate}}"
                ];

                scope.templateEntity = [
                    {
                        "entityName": "Group",
                        "templateKeys": scope.groupTemplateKeys
                    },
                    {
                        "entityName": "SavingsAccount",
                        "templateKeys": scope.savingsAccountTemplateKeys
                    },
                    {
                        "entityName": "Loan",
                        "templateKeys": scope.loanTemplateKeys
                    },
                    {
                        "entityName": "Repayment Schedule",
                        "templateKeys": scope.repaymentTemplateKeys
                    },
                    {
                        "entityName": "Disbursement",
                        "templateKeys": scope.disbursementTemplateKeys
                    },
                    {
                        "entityName": "Penalties and Charges",
                        "templateKeys": scope.chargesTemplateKeys
                    },
                    {
                        "entityName": "Loan Product",
                        "templateKeys": scope.loanProductTemplateKeys
                    },
                    {
                        "entityName": "Loan Summary",
                        "templateKeys": scope.loanSummaryTemplateKeys
                    },
                    {
                        "entityName": "Client",
                        "templateKeys": scope.clientTemplateKeys
                    },
                    {
                        "entityName": "Additional Info",
                        "templateKeys": scope.additionalInfo
                    }
                ];
                scope.setEditorText('');
            };

            scope.entityChange = function (entityId) {
                scope.mappers = _.reject(scope.mappers, function (mapper) {
                    return mapper.mappersvalue && mapper.mappersvalue.indexOf('{{loan.clientId}}') !== -1;
                });
                if (entityId === 1) {
                    scope.mappers.splice(0, 1, {
                        mappersorder: 0,
                        mapperskey: "loan",
                        mappersvalue: "loans/{{loanId}}?associations=all&tenantIdentifier=" + $rootScope.tenantIdentifier,
                        defaultAddIcon: 'true'
                    });
                    if (!_.findWhere(scope.mappers, {mapperskey: "client"})) {
                        scope.mappers.splice(1, 0, {
                            mappersorder: 1,
                            mapperskey: "client",
                            mappersvalue: "clients/{{loan.clientId}}?tenantIdentifier=" + $rootScope.tenantIdentifier
                        });
                    }
                    scope.loanKeys();
                    scope.templateKeyEntity = "Loan";
                } else if (entityId === 0){
                    scope.templateKeyEntity = "Client";
                    scope.mappers.splice(0, 1, {
                        mappersorder: 0,
                        mapperskey: "client",
                        mappersvalue: "clients/{{clientId}}?tenantIdentifier=" + $rootScope.tenantIdentifier,
                        defaultAddIcon: 'true'
                    });
                    scope.clientKeys();
                    scope.loanKeys();
                    scope.savingsAccountKeys();
                    scope.groupKeys();
                } else if (entityId === 2){
                    scope.templateKeyEntity = "Savings Account";
                    scope.mappers.splice(0, 1, {
                        mappersorder: 0,
                        mapperskey: "savingsaccount",
                        mappersvalue: "savingsaccounts/{{savingsAccountId}}?tenantIdentifier=" + $rootScope.tenantIdentifier,
                        defaultAddIcon: 'true'
                    });
                    scope.savingsAccountKeys();
                }
                else if (entityId === 3){
                    scope.templateKeyEntity = "Group";
                    scope.mappers.splice(0, 1, {
                        mappersorder: 0,
                        mapperskey: "group",
                        mappersvalue: "group/{{groupId}}?tenantIdentifier=" + $rootScope.tenantIdentifier,
                        defaultAddIcon: 'true'
                    });
                    scope.groupKeys();
                }
            };

            scope.templateKeySelected = function (templateKey) {
                if (templateKey && templateKey.html) {
                    var editor = scope.editorInstance();
                    if (editor) {
                        editor.insertHtml(templateKey.html);
                    } else {
                        scope.formData.text = (scope.formData.text || '') + templateKey.html;
                    }
                    return;
                }
                scope.insertEditorText(templateKey && templateKey.value ? templateKey.value : templateKey);
            };

            scope.templateKeyLabel = function (templateKey) {
                return templateKey && templateKey.label ? templateKey.label : '';
            };

            scope.templateKeyDisplay = function (templateKey) {
                return templateKey && typeof templateKey === 'object' ? (templateKey.value || '') : templateKey;
            };

            scope.addMapperKeyValue = function () {
                scope.mappers.push({
                    mappersorder: scope.mappers.length,
                    mapperskey: "",
                    mappersvalue: ""
                });
            };

            scope.deleteMapperKeyValue = function (index) {
                scope.mappers.splice(index, 1);
            };

            scope.advanceOptionClick = function () {
                if (scope.advanceOption == 'false') {
                    scope.advanceOption = 'true';
                } else {
                    scope.advanceOption = 'false';
                }
            };

            scope.extractError = function (response) {
                var data = response ? response.data : null;
                if (data) {
                    if (data.errors && data.errors.length > 0) {
                        return data.errors[0].defaultUserMessage || data.errors[0].developerMessage;
                    }
                    if (data.defaultUserMessage) {
                        return data.defaultUserMessage;
                    }
                    if (data.developerMessage) {
                        return data.developerMessage;
                    }
                }
                if (response && response.status) {
                    return 'Request failed with status ' + response.status + '.';
                }
                return 'The template could not be saved. Please try again.';
            };

            scope.serverError = null;
            scope.successMessage = null;
            scope.saving = false;
            scope.submitted = false;

            scope.bodyMissing = function () {
                var text = scope.formData.text;
                return !text || !String(text).replace(/<[^>]*>/g, '').trim();
            };

            scope.submit = function () {
                if (scope.saving) {
                    return;
                }
                scope.serverError = null;
                scope.successMessage = null;
                scope.submitted = true;
                scope.formData.text = scope.editorText();

                if ((scope.templateForm && scope.templateForm.$invalid) || scope.bodyMissing()) {
                    return;
                }

                for (var i in scope.mappers) {
                    delete scope.mappers[i].defaultAddIcon;
                }
                scope.formData.mappers = scope.mappers;
                scope.saving = true;

                resourceFactory.templateResource.save(scope.formData, function (data) {
                    scope.saving = false;
                    scope.successMessage = 'label.template.message.created';
                    $timeout(function () {
                        location.path('/viewtemplate/' + data.resourceId);
                    }, 2000);
                }, function (response) {
                    scope.saving = false;
                    scope.serverError = scope.extractError(response);
                });
            };


        }
    });
    mifosX.ng.application.controller('CreateTemplateController', ['$scope', 'ResourceFactory', '$location', '$rootScope', '$timeout', mifosX.controllers.CreateTemplateController]).run(function ($log) {
        $log.info("CreateTemplateController initialized");
    });
}(mifosX.controllers || {}));
