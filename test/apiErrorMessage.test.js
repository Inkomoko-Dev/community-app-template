const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../app/scripts/modules/apiErrorMessage');

function french(code) {
    const catalog = {
        'error.msg.amount.exceeds.limit': 'Le montant dépasse la limite.',
        'error.msg.field.required': '{{params[0].value}} est obligatoire.'
    };
    return function (key, params) {
        if (!catalog[key]) {
            return key;
        }
        return catalog[key].replace('{{params[0].value}}', params && params.params ? params.params[0].value : '');
    };
}

test('shows every field error and prefers a translation over the English API text', function () {
    const parsed = api.parseHttpError(400, {
        developerMessage: 'internal detail',
        errors: [{
            parameterName: 'transactionAmount',
            userMessageGlobalisationCode: 'error.msg.amount.exceeds.limit',
            defaultUserMessage: 'Amount exceeds limit',
            value: '999999'
        }, {
            parameterName: 'id',
            defaultUserMessage: 'Locale is required'
        }]
    }, french());

    assert.equal(parsed.errorStatus, null);
    assert.equal(parsed.errorDetails.length, 2);
    assert.equal(parsed.errorDetails[0].message, 'Le montant dépasse la limite.');
    assert.equal(parsed.errorDetails[0].field, 'transactionAmount');
    assert.equal(parsed.errorDetails[0].message.includes('999999'), false);
    assert.equal(parsed.errorDetails[0].message.includes('internal detail'), false);
    assert.equal(parsed.errorDetails[1].field, '');
    assert.equal(parsed.errorDetails[1].message, 'Locale is required');
});

test('uses the English API message when the active language has no translation', function () {
    const parsed = api.parseHttpError(422, {
        errors: [{
            parameterName: 'note',
            userMessageGlobalisationCode: 'validation.msg.missing.in.both.catalogs',
            defaultUserMessage: 'Notes are required for this action.'
        }]
    }, function (code) {
        return code;
    });

    assert.equal(parsed.errorDetails[0].message, 'Notes are required for this action.');
});

test('shows a domain-rule message for 403 and an escalation line when the body has none', function () {
    const withReason = api.parseHttpError(403, {
        defaultUserMessage: 'Errors contain reason for domain rule violation.',
        errors: [{
            defaultUserMessage: 'You cannot approve this loan.'
        }]
    }, function (code) { return code; });
    assert.equal(withReason.errorDetails[0].message, 'You cannot approve this loan.');
    assert.equal(withReason.errorStatus, null);

    const withoutReason = api.parseHttpError(403, {developerMessage: 'missing permission CREATE_LOAN'}, function (code) { return code; });
    assert.equal(withoutReason.errorDetails.length, 0);
    assert.match(withoutReason.errorStatus, /permission/i);
    assert.equal(withoutReason.errorStatus.includes('CREATE_LOAN'), false);
});

test('shows the Fineract reason on a 500 and hides the generic platform sentence', function () {
    const explained = api.parseHttpError(500, {
        developerMessage: 'java.lang.NullPointerException\n\tat org.apache.fineract.Loan.waive',
        defaultUserMessage: 'An unexpected error occured on the platform server.',
        userMessageGlobalisationCode: 'error.msg.platform.server.side.error',
        errors: [{
            parameterName: 'id',
            userMessageGlobalisationCode: 'error.msg.loan.waive.interest.amount.exceeds.total.outstanding.interest',
            defaultUserMessage: 'The amount of interest to waive cannot be greater than total interest outstanding on loan.'
        }]
    }, function (code) { return code; });

    assert.equal(explained.errorStatus, null);
    assert.equal(explained.errorDetails.length, 1);
    assert.equal(explained.errorDetails[0].message,
        'The amount of interest to waive cannot be greater than total interest outstanding on loan.');
    assert.equal(explained.errorDetails[0].message.includes('NullPointerException'), false);

    const boilerplate = api.parseHttpError(500, {
        defaultUserMessage: 'An unexpected error occured on the platform server.',
        errors: [{
            defaultUserMessage: 'An unexpected error occured on the platform server.'
        }]
    }, function (code) { return code; });
    assert.match(boilerplate.errorStatus, /server/i);
    assert.equal(boilerplate.errorDetails.length, 0);
});

test('uses an escalation line for server and connection failures', function () {
    const server = api.parseHttpError(500, '<html>gateway</html>', function (code) { return code; });
    assert.match(server.errorStatus, /server/i);
    assert.equal(server.errorDetails.length, 0);

    const offline = api.parseHttpError(0, null, function (code) { return code; });
    assert.match(offline.errorStatus, /connection/i);

    const missing = api.parseHttpError(404, {}, function (code) { return code; });
    assert.match(missing.errorStatus, /could not be found/i);

    const conflict = api.parseHttpError(409, {}, function (code) { return code; });
    assert.match(conflict.errorStatus, /changed by someone else/i);
});

test('keeps a readable item when a batch fragment is not JSON', function () {
    const parsed = api.parseBatchFailures([
        {statusCode: 400, body: JSON.stringify({errors: [{defaultUserMessage: 'Amount exceeds limit'}]})},
        {statusCode: 500, body: '<html>bad gateway</html>'}
    ], function (code) { return code; });

    assert.equal(parsed.errorDetails[0].message, 'Amount exceeds limit');
    assert.match(parsed.errorDetails[1].message, /server/i);
    assert.equal(parsed.errorStatus, null);
    assert.equal(parsed.errorDetails.length, 2);
});

test('normalizes the older nested error list and a flat client-side list', function () {
    const nested = api.normalizeErrors([[{
        field: 'transactionDate',
        code: 'error.msg.field.required',
        args: {params: [{value: 'Transaction date'}]}
    }]], french());
    assert.equal(nested[0].message, 'Transaction date est obligatoire.');

    const flat = api.normalizeErrors([{
        message: 'Select a partner.',
        field: 'partner'
    }]);
    assert.equal(flat[0].fieldLabel, 'Partner');
    assert.equal(flat[0].message, 'Select a partner.');
});

test('keeps the permission name when a translated error is shown again', function () {
    const once = api.normalizeErrors([{
        userMessageGlobalisationCode: 'error.msg.permission.code.invalid',
        defaultUserMessage: 'Permission with Code CREATE_x_partner_client_mapping does not exist',
        parameterName: 'id',
        args: [{value: 'CREATE_x_partner_client_mapping'}]
    }], function (code, params) {
        var value = params && params.params && params.params[0] ? params.params[0].value : '';
        return 'Permission with code `' + value + '` does not exist.';
    });
    const twice = api.normalizeErrors(once, function () {
        return 'Permission with code `` does not exist.';
    });
    assert.equal(twice[0].message, 'Permission with code `CREATE_x_partner_client_mapping` does not exist.');
});

test('clears a displayed error only when the same write is submitted again', function () {
    const key = api.requestKey('POST', '/loans/1?command=approve');
    assert.equal(api.shouldClearForRequest('GET', '/loans/1', key), false);
    assert.equal(api.shouldClearForRequest('POST', '/loans/2?command=approve', key), false);
    assert.equal(api.shouldClearForRequest('PUT', '/loans/1?command=approve', key), false);
    assert.equal(api.shouldClearForRequest('POST', '/loans/1?command=approve', key), true);
    assert.equal(api.shouldClearForRequest('POST', '/loans/1?command=approve', null), false);
    assert.equal(api.shouldClearForRequest('GET', '/loans/1', null), false);
});
