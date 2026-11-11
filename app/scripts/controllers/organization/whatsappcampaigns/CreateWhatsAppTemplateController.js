(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateWhatsAppTemplateController: function (scope, resourceFactory, location) {
            scope.templateData = {
                name: '',
                language: 'en',
                category: 'UTILITY',
                components: {
                    headerText: '',
                    bodyText: '',
                    footerText: '',
                    phoneButtonText: '',
                    phoneButtonNumber: ''
                }
            };
            scope.isButtonDisabled = false;

            scope.templateCategoryOptions = [
                {id: 'UTILITY', value: 'Utility'},
                {id: 'MARKETING', value: 'Marketing'},
                {id: 'AUTHENTICATION', value: 'Authentication'}
            ];

            scope.submit = function () {
                if (scope.isButtonDisabled) {
                    return;
                }
                scope.isButtonDisabled = true;

                // Build Africa's Talking template creation payload components
                var components = {};

                if (scope.templateData.components.headerText) {
                    components.header = {
                        type: 'HEADER',
                        format: 'TEXT',
                        text: scope.templateData.components.headerText,
                        example: { header_text: ['Sample header text'] }
                    };
                }

                if (scope.templateData.components.bodyText) {
                    components.body = {
                        type: 'BODY',
                        kind: 'TEXT',
                        text: scope.templateData.components.bodyText,
                        example: { body_text: ['Sample body text'] }
                    };
                }

                if (scope.templateData.components.footerText) {
                    components.footer = {
                        type: 'FOOTER',
                        kind: 'TEXT',
                        text: scope.templateData.components.footerText
                    };
                }

                if (scope.templateData.components.phoneButtonText && scope.templateData.components.phoneButtonNumber) {
                    components.buttons = {
                        type: 'BUTTONS',
                        buttons: [{
                            type: 'PHONE_NUMBER',
                            text: scope.templateData.components.phoneButtonText,
                            phoneNumber: scope.templateData.components.phoneButtonNumber
                        }]
                    };
                }

                var payload = {
                    name: scope.templateData.name,
                    language: scope.templateData.language,
                    category: scope.templateData.category,
                    components: components
                };

                resourceFactory.africasTalkingTemplateResource.save(payload, function (data) {
                    scope.isButtonDisabled = false;
                    // Only treat a real resource id as success (API throws on AT rejection).
                    if (data && (data.resourceId || data.resourceId === 0)) {
                        location.path('/whatsappcampaigns');
                        return;
                    }
                    scope.errorDetails = [{
                        userMessageGlobalisationCode: 'error.msg.generic',
                        defaultUserMessage: 'Template creation failed.'
                    }];
                }, function (response) {
                    scope.isButtonDisabled = false;
                    scope.errorStatus = response.status;
                    scope.errorDetails = [];
                    if (response.data && response.data.errors) {
                        scope.errorDetails = response.data.errors;
                    } else if (response.data && (response.data.userMessage || response.data.defaultUserMessage || response.data.developerMessage)) {
                        scope.errorDetails.push({
                            userMessageGlobalisationCode: 'error.msg.generic',
                            defaultUserMessage: response.data.userMessage || response.data.defaultUserMessage || response.data.developerMessage
                        });
                    } else {
                        scope.errorDetails.push({
                            userMessageGlobalisationCode: 'error.msg.generic',
                            defaultUserMessage: 'Template creation failed.'
                        });
                    }
                });
            };

            scope.cancel = function () {
                location.path('/whatsappcampaigns');
            };
        }
    });
    mifosX.ng.application.controller('CreateWhatsAppTemplateController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.CreateWhatsAppTemplateController]).run(function ($log) {
        $log.info("CreateWhatsAppTemplateController initialized");
    });
}(mifosX.controllers || {}));
