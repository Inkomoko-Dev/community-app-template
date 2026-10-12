(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.ApiErrorMessage = api;
})(typeof window !== 'undefined' ? window : global, function () {
    var ENGLISH = {
        'error.msg.no.connection': 'No connection. Check your network and try again. If this continues, contact support.',
        'error.msg.session.expired': 'Your session has expired. Sign in again.',
        'error.msg.not.authorized.escalation': 'You do not have permission to do this. Contact your supervisor if you need access.',
        'error.msg.not.found.escalation': 'This record could not be found. Refresh the page. If it is still missing, contact support.',
        'error.msg.conflict.escalation': 'This record was changed by someone else. Refresh and try again.',
        'error.msg.server.escalation': 'Something went wrong on the server. Try again. If it continues, contact support and include the time of this action.',
        'error.msg.field.required': '{{params[0].value}} is required.',
        'error.msg.field.invalid': '{{params[0].value}} is not valid.',
        'error.msg.datatable.entry.failed': 'Could not save the {{params[0].value}} entry.'
    };

    var ESCALATION_BY_STATUS = {
        0: 'error.msg.no.connection',
        '-1': 'error.msg.no.connection',
        401: 'error.msg.session.expired',
        403: 'error.msg.not.authorized.escalation',
        404: 'error.msg.not.found.escalation',
        405: 'error.msg.server.escalation',
        409: 'error.msg.conflict.escalation',
        500: 'error.msg.server.escalation',
        502: 'error.msg.server.escalation',
        504: 'error.msg.server.escalation'
    };

    function isArray(value) {
        return Object.prototype.toString.call(value) === '[object Array]';
    }

    function interpolate(template, params) {
        if (!template || template.indexOf('{{') === -1) {
            return template;
        }
        return template.replace(/\{\{params\[(\d+)\]\.value\}\}/g, function (_match, index) {
            var param = params && params.params && params.params[index];
            if (!param || param.value === undefined || param.value === null) {
                return '';
            }
            return String(param.value);
        });
    }

    function translateCode(code, params, translate) {
        if (!code) {
            return null;
        }
        if (typeof translate === 'function') {
            var translated = translate(code, params || {});
            if (translated && translated !== code) {
                return translated;
            }
        }
        if (ENGLISH[code]) {
            return interpolate(ENGLISH[code], params);
        }
        return null;
    }

    function argumentParams(error) {
        if (!error) {
            return {};
        }
        if (error.args && error.args.params) {
            return error.args;
        }
        if (isArray(error.args)) {
            return {
                params: error.args.map(function (arg) {
                    if (arg && typeof arg === 'object' && Object.prototype.hasOwnProperty.call(arg, 'value')) {
                        return {value: arg.value};
                    }
                    return {value: arg};
                })
            };
        }
        return error.args || {};
    }

    function humanizeField(name) {
        if (!name) {
            return '';
        }
        var spaced = String(name)
            .replace(/[\[\].]/g, ' ')
            .replace(/[_-]+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\s+/g, ' ')
            .trim();
        if (!spaced) {
            return '';
        }
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    }

    function userText(error, translate) {
        if (!error) {
            return '';
        }
        var code = error.code || error.userMessageGlobalisationCode || '';
        var params = argumentParams(error);
        var translated = translateCode(code, params, translate);
        if (translated) {
            return translated;
        }
        if (error.defaultUserMessage) {
            return error.defaultUserMessage;
        }
        if (error.message && error.message !== code) {
            return error.message;
        }
        return translated || '';
    }

    function toDisplayError(error, translate) {
        if (!error) {
            return null;
        }
        var field = error.field || error.parameterName || '';
        if (field === 'id') {
            field = '';
        }
        var message = userText(error, translate);
        if (!message && field) {
            message = translateCode('error.msg.field.invalid', {params: [{value: humanizeField(field)}]}, translate);
        }
        if (!message && error.datatable) {
            message = translateCode('error.msg.datatable.entry.failed', {params: [{value: error.datatable}]}, translate);
        }
        if (!message) {
            return null;
        }
        return {
            field: field,
            fieldLabel: humanizeField(field),
            code: error.code || error.userMessageGlobalisationCode || '',
            message: message,
            datatable: error.datatable || ''
        };
    }

    function normalizeErrors(details, translate) {
        var flat = [];
        if (!details || !details.length) {
            return flat;
        }
        for (var i = 0; i < details.length; i++) {
            var entry = details[i];
            if (isArray(entry)) {
                for (var j = 0; j < entry.length; j++) {
                    var nested = toDisplayError(entry[j], translate);
                    if (nested) {
                        flat.push(nested);
                    }
                }
            } else {
                var display = toDisplayError(entry, translate);
                if (display) {
                    flat.push(display);
                }
            }
        }
        return flat;
    }

    function asJson(data) {
        if (data === undefined || data === null || data === '') {
            return null;
        }
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (ignore) {
                return null;
            }
        }
        if (typeof data === 'object') {
            return data;
        }
        return null;
    }

    function escalationMessage(status, translate) {
        var code = ESCALATION_BY_STATUS[String(status)];
        if (!code && (status === 0 || status === -1 || status === undefined || status === null)) {
            code = 'error.msg.no.connection';
        }
        if (!code) {
            code = 'error.msg.server.escalation';
        }
        return translateCode(code, {}, translate);
    }

    function hidesServerBody(status) {
        return status === 0 || status === -1 || status === undefined || status === null ||
            status === 401 || status === 405 || status === 500 || status === 502 || status === 504;
    }

    function parseHttpError(status, data, translate) {
        var body = asJson(data);
        var developerMessage = body && body.developerMessage ? body.developerMessage : null;
        if (hidesServerBody(status) || (!body && (status === 500 || status === 502 || status === 504 || status === 401))) {
            return {
                errorStatus: escalationMessage(status, translate),
                errorDetails: [],
                developerMessage: developerMessage,
                raw: data
            };
        }

        var sourceErrors = body && isArray(body.errors) ? body.errors : [];
        var errorDetails = normalizeErrors(sourceErrors, translate);
        if (errorDetails.length) {
            return {
                errorStatus: null,
                errorDetails: errorDetails,
                developerMessage: developerMessage,
                raw: data
            };
        }

        if (body && (body.defaultUserMessage || body.userMessageGlobalisationCode)) {
            var single = toDisplayError(body, translate);
            if (single) {
                return {
                    errorStatus: null,
                    errorDetails: [single],
                    developerMessage: developerMessage,
                    raw: data
                };
            }
        }

        return {
            errorStatus: escalationMessage(body ? status : (status || 0), translate),
            errorDetails: [],
            developerMessage: developerMessage,
            raw: data
        };
    }

    function parseBatchFailures(failedResponses, translate) {
        var errorDetails = [];
        var responses = failedResponses || [];
        for (var i = 0; i < responses.length; i++) {
            var item = responses[i] || {};
            var status = item.statusCode || 400;
            var parsed = parseHttpError(status, item.body !== undefined ? item.body : item, translate);
            if (parsed.errorDetails.length) {
                errorDetails = errorDetails.concat(parsed.errorDetails);
            } else if (parsed.errorStatus) {
                errorDetails.push({
                    field: '',
                    fieldLabel: '',
                    code: '',
                    message: parsed.errorStatus,
                    datatable: ''
                });
            }
        }
        return {
            errorStatus: null,
            errorDetails: errorDetails,
            developerMessage: null,
            raw: failedResponses
        };
    }

        function requestKey(method, url) {
            return (method || 'GET') + ' ' + (url || '');
        }

        function shouldClearForRequest(method, url, activeErrorRequestKey) {
            if (!activeErrorRequestKey || !method || method === 'GET') {
                return false;
            }
            return requestKey(method, url) === activeErrorRequestKey;
        }

        return {
            ENGLISH: ENGLISH,
            humanizeField: humanizeField,
            normalizeErrors: normalizeErrors,
            parseHttpError: parseHttpError,
            parseBatchFailures: parseBatchFailures,
            escalationMessage: escalationMessage,
            requestKey: requestKey,
            shouldClearForRequest: shouldClearForRequest
        };
});
