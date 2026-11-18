const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const listeners = new Map();

function loadController() {
    const context = {
        console,
        setTimeout: function () { return global.setTimeout.apply(global, arguments); },
        clearTimeout: function (id) { return global.clearTimeout(id); },
        get Date() { return global.Date; },
        Math,
        Array,
        String,
        Number,
        Object,
        Error,
        JSON,
        Promise,
        window: {},
        _: {
            extend: function (target) {
                const sources = Array.prototype.slice.call(arguments, 1);
                sources.forEach(function (source) {
                    if (!source) {
                        return;
                    }
                    Object.keys(source).forEach(function (key) {
                        target[key] = source[key];
                    });
                });
                return target;
            }
        },
        mifosX: {
            controllers: {},
            ng: {
                application: {
                    controller: function () {
                        return { run: function () {} };
                    }
                }
            }
        }
    };
    context.window = context;
    context.global = context;
    vm.createContext(context);
    vm.runInContext(
        fs.readFileSync(path.join(__dirname, '../app/scripts/controllers/loanAccount/ViewLoanDetailsController.js'), 'utf8'),
        context,
        { filename: 'ViewLoanDetailsController.js' }
    );
    return context.mifosX.controllers.ViewLoanDetailsController;
}

const ViewLoanDetailsController = loadController();

function createHarness(loanId) {
    const posts = { rwanda: [], kenya: [] };
    const pending = { rwanda: null, kenya: null };
    const location = { path: function () { location.calls.push(Array.prototype.slice.call(arguments)); } };
    location.calls = [];
    const logs = [];
    const handlers = {};
    const scope = {
        optlang: { code: 'en' },
        df: 'dd MMMM yyyy',
        $on: function (name, handler) {
            handlers[name] = handlers[name] || [];
            handlers[name].push(handler);
        },
        $watch: function () {}
    };
    const rootScope = {
        bankDisbursementResult: null,
        $applyAsync: function (fn) { fn(); },
        $broadcast: function (name, data) {
            (handlers[name] || []).forEach(function (handler) { handler(null, data); });
        }
    };
    const resources = {
        LoanAccountResource: { getLoanAccountDetails: function () {}, delete: function () {} },
        verifyLoanOnTransUnionRwanda: {
            post: function (params, success, error) {
                posts.rwanda.push(params);
                pending.rwanda = { success: success, error: error };
            }
        },
        verifyLoanOnMetropolKenya: {
            post: function (params, success, error) {
                posts.kenya.push(params);
                pending.kenya = { success: success, error: error };
            }
        }
    };
    function idleResource() {
        return new Proxy({}, {
            get: function (target, method) {
                if (!target[method]) {
                    target[method] = function () {};
                }
                return target[method];
            }
        });
    }
    const resourceFactory = new Proxy(resources, {
        get: function (target, name) {
            if (!target[name]) {
                target[name] = idleResource();
            }
            return target[name];
        }
    });
    const interval = function () { return 1; };
    interval.cancel = function () {};

    ViewLoanDetailsController(
        scope,
        { id: loanId },
        resourceFactory,
        { paginate: function () { return { currentPageItems: [] }; } },
        location,
        { reload: function () {} },
        {},
        { open: function () {} },
        function () { return ''; },
        '/api/v1',
        {},
        rootScope,
        {},
        interval,
        { get: function () {} },
        { getFromLocalStorage: function () {} },
        { info: function (line) { logs.push(line); } }
    );

    return { scope: scope, posts: posts, pending: pending, location: location, logs: logs, rootScope: rootScope };
}

function release(harness) {
    if (harness.pending.rwanda && harness.pending.rwanda.error) {
        harness.pending.rwanda.error({});
    }
    if (harness.pending.kenya && harness.pending.kenya.error) {
        harness.pending.kenya.error({});
    }
}

test('a second Rwanda click does not send another TransUnion request', function () {
    const harness = createHarness(64701);
    try {
        harness.scope.clickEvent('crbVerification', 64701);
        harness.scope.clickEvent('crbVerification', 64701);

        assert.equal(harness.posts.rwanda.length, 1);
        assert.equal(harness.posts.rwanda[0].loanId, 64701);
        assert.equal(harness.posts.kenya.length, 0);
        assert.equal(harness.scope.isCrbVerificationInProgress, true);
        assert.equal(harness.scope.isCrbVerificationFrozen('button.crbVerification'), true);
        assert.equal(harness.scope.isCrbVerificationFrozen('button.crbVerificationKenya'), true);
        assert.equal(harness.scope.isCrbVerificationFrozen('button.approve'), false);
        assert.equal(harness.logs.filter(function (line) { return line.indexOf('duplicate click ignored') !== -1; }).length, 1);
        assert.equal(harness.logs.some(function (line) { return line.indexOf('bureau=rwanda') !== -1 && line.indexOf('request started') !== -1; }), true);
    } finally {
        release(harness);
    }
});

test('a second Kenya click does not send another Metropol request', function () {
    const harness = createHarness(64702);
    try {
        harness.scope.clickEvent('crbVerificationKenya', 64702);
        harness.scope.clickEvent('crbVerificationKenya', 64702);

        assert.equal(harness.posts.kenya.length, 1);
        assert.equal(harness.posts.kenya[0].loanId, 64702);
        assert.equal(harness.posts.rwanda.length, 0);
        assert.equal(harness.scope.isCrbVerificationFrozen('button.crbVerificationKenya'), true);
    } finally {
        release(harness);
    }
});

test('a successful response releases the button and a later click can verify again', function () {
    const harness = createHarness(64703);
    harness.scope.getCrbReport = function () { harness.getCrbReport = true; };
    harness.scope.clickEvent('crbVerification', 64703);
    harness.pending.rwanda.success({});

    assert.equal(harness.scope.isCrbVerificationInProgress, false);
    assert.equal(harness.getCrbReport, true);
    assert.equal(harness.location.calls.length, 1);

    harness.scope.clickEvent('crbVerification', 64703);
    assert.equal(harness.posts.rwanda.length, 2);
    release(harness);
});

test('an error response releases the button without the timeout message', function () {
    const harness = createHarness(64704);
    harness.scope.clickEvent('crbVerificationKenya', 64704);
    harness.pending.kenya.error({ status: 500 });

    assert.equal(harness.scope.isCrbVerificationInProgress, false);
    assert.equal(harness.scope.crbVerificationTimedOut, false);
    assert.equal(harness.location.calls.length, 0);
    assert.equal(harness.logs.some(function (line) { return line.indexOf('error response') !== -1; }), true);
});

test('no response within 60 seconds releases the button and ignores a late success', function (t) {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const harness = createHarness(64705);
    harness.scope.getCrbReport = function () { harness.getCrbReport = true; };
    harness.scope.clickEvent('crbVerification', 64705);

    t.mock.timers.tick(59999);
    assert.equal(harness.scope.isCrbVerificationInProgress, true);
    assert.equal(harness.scope.crbVerificationTimedOut, false);

    t.mock.timers.tick(1);
    assert.equal(harness.scope.isCrbVerificationInProgress, false);
    assert.equal(harness.scope.crbVerificationTimedOut, true);
    assert.equal(harness.logs.some(function (line) { return line.indexOf('timed out after 60000ms') !== -1; }), true);

    harness.pending.rwanda.success({});
    assert.equal(harness.getCrbReport, undefined);
    assert.equal(harness.location.calls.length, 0);
    assert.equal(harness.logs.some(function (line) { return line.indexOf('late response received ignored') !== -1; }), true);
});

test('returning to the loan while the request is still running keeps the button frozen', function () {
    const first = createHarness(64706);
    first.scope.clickEvent('crbVerification', 64706);
    const second = createHarness(64706);

    assert.equal(second.scope.isCrbVerificationInProgress, true);
    assert.equal(second.posts.rwanda.length, 0);
    second.scope.clickEvent('crbVerification', 64706);
    assert.equal(first.posts.rwanda.length, 1);
    release(first);
});

test('the loan screen wires the freeze to both the Rwanda button and the Kenya menu item', function () {
    const html = fs.readFileSync(path.join(__dirname, '../app/views/loans/viewloanaccountdetails.html'), 'utf8');
    const guardedClicks = html.match(/isCrbVerificationFrozen\(button\.name\) \|\| clickEvent/g) || [];
    assert.equal(guardedClicks.length, 2);
    assert.equal(html.indexOf("label.msg.crbVerification.timeout") !== -1, true);
});
