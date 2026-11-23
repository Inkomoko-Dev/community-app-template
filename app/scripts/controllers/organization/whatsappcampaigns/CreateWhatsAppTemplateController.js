(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateWhatsAppTemplateController: function (scope, resourceFactory, location) {
            scope.templateData = {
                name: '',
                language: 'en',
                category: 'UTILITY',
                markAsApproved: false,
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

                // Build Africa's Talking template creation payload components.
                // Docs: example.body_text must list one sample per {{n}} placeholder.
                var defaultSamples = ['Jane Doe', '1500.00', '000012345', '8500.00', 'Sample5', 'Sample6', 'Sample7', 'Sample8'];

                function maxPlaceholderIndex(text) {
                    var max = 0;
                    var re = /\{\{\s*(\d+)\s*\}\}/g;
                    var match;
                    while ((match = re.exec(text || '')) !== null) {
                        var idx = parseInt(match[1], 10);
                        if (!isNaN(idx) && idx > max) {
                            max = idx;
                        }
                    }
                    return max;
                }

                function samplesFor(text) {
                    var count = maxPlaceholderIndex(text);
                    var samples = [];
                    for (var i = 0; i < count; i++) {
                        samples.push(defaultSamples[i] || ('Sample' + (i + 1)));
                    }
                    return samples;
                }

                var components = {};

                if (scope.templateData.components.headerText) {
                    var headerText = scope.templateData.components.headerText;
                    var headerSamples = samplesFor(headerText);
                    components.header = {
                        type: 'HEADER',
                        format: 'TEXT',
                        text: headerText
                    };
                    if (headerSamples.length === 1) {
                        // AT create_template example uses a string for a single header variable.
                        components.header.example = { header_text: headerSamples[0] };
                    } else if (headerSamples.length > 1) {
                        components.header.example = { header_text: headerSamples };
                    }
                }

                if (scope.templateData.components.bodyText) {
                    var bodyText = scope.templateData.components.bodyText;
                    var bodySamples = samplesFor(bodyText);
                    components.body = {
                        type: 'BODY',
                        kind: 'TEXT',
                        text: bodyText
                    };
                    if (bodySamples.length > 0) {
                        components.body.example = { body_text: bodySamples };
                    }
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
                    markAsApproved: !!scope.templateData.markAsApproved,
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
