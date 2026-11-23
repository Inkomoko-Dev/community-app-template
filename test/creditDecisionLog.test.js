const test = require('node:test');
const assert = require('node:assert/strict');
const log = require('../app/scripts/modules/creditDecisionLog');

test('an empty filter asks only for the first page', function () {
    assert.deepEqual(log.query(log.blank(), 1, 25), {page: 1, pageSize: 25});
});

test('outcome tabs split into the engine decision and how far the request got', function () {
    assert.equal(log.query({outcome: 'AUTO_APPROVE'}, 1, 25).decision, 'AUTO_APPROVE');
    assert.equal(log.query({outcome: 'NONE'}, 1, 25).decision, 'NONE');
    var held = log.query({outcome: 'HELD'}, 1, 25);
    assert.equal(held.status, 'HELD');
    assert.equal(held.decision, undefined);
    assert.equal(log.query({outcome: 'AWAITING'}, 1, 25).status, 'AWAITING');
});

test('blank and padded text is dropped or trimmed, dates become yyyy-mm-dd', function () {
    var q = log.query({search: '  A-12 ', reason: '   ', mode: 'LIVE', profileId: 3, from: new Date(2026, 10, 8), to: '2026-11-09T10:00:00', sort: 'score_desc'}, 2, 50);
    assert.deepEqual(q, {page: 2, pageSize: 50, search: 'A-12', mode: 'LIVE', profileId: 3, from: '2026-11-08', to: '2026-11-09', sort: 'score_desc'});
});

test('an unknown page size or sort falls back to the defaults', function () {
    var q = log.query({sort: 'id; drop'}, 0, 7);
    assert.equal(q.page, 1);
    assert.equal(q.pageSize, 25);
    assert.equal(q.sort, undefined);
});

test('active filters are counted without the outcome tab, a date range counts once', function () {
    assert.equal(log.activeCount(log.blank()), 0);
    assert.equal(log.activeCount({outcome: 'AUTO_APPROVE', mode: 'LIVE', from: '2026-11-01', to: '2026-11-09', search: ' '}), 2);
    assert.equal(log.isFiltered({outcome: 'AUTO_APPROVE'}), true);
    assert.equal(log.isFiltered(log.blank()), false);
});

test('the range text', function () {
    assert.deepEqual(log.range(1, 25, 0), {first: 0, last: 0, total: 0});
    assert.deepEqual(log.range(1, 25, 137), {first: 1, last: 25, total: 137});
    assert.deepEqual(log.range(6, 25, 137), {first: 126, last: 137, total: 137});
});

test('page numbers stay short and keep the first and last page', function () {
    assert.deepEqual(log.pages(1, 1), [1]);
    assert.deepEqual(log.pages(3, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(log.pages(1, 20), [1, 2, 3, 4, 5, null, 20]);
    assert.deepEqual(log.pages(10, 20), [1, null, 9, 10, 11, null, 20]);
    assert.deepEqual(log.pages(20, 20), [1, null, 16, 17, 18, 19, 20]);
    [1, 2, 5, 9, 19, 20].forEach(function (p) {
        var out = log.pages(p, 20);
        assert.ok(out.length <= 7);
        assert.ok(out.indexOf(p) >= 0);
        assert.equal(out[0], 1);
        assert.equal(out[out.length - 1], 20);
    });
});

test('JSON bodies are pretty printed and anything else is left alone', function () {
    assert.equal(log.prettify('{"a":1}'), '{\n  "a": 1\n}');
    assert.equal(log.prettify('not json'), 'not json');
    assert.equal(log.prettify(null), '');
});

test('risk tier and model version are sent when chosen and counted as filters', function () {
    var q = log.query({riskTier: ' LOW ', modelVersion: '1.1'}, 1, 25);
    assert.equal(q.riskTier, 'LOW');
    assert.equal(q.modelVersion, '1.1');
    assert.equal(log.activeCount({riskTier: 'LOW', modelVersion: '1.1'}), 2);
    assert.equal(log.query(log.blank(), 1, 25).riskTier, undefined);
});

test('the exception queue says what happens next to each application', function () {
    assert.deepEqual(log.exceptionNext({kind: 'FAILED', nextRetryOn: '2026-11-09T10:05:00'}), {key: 'label.creditdecision.exceptions.next.scheduled', at: '2026-11-09T10:05:00'});
    assert.deepEqual(log.exceptionNext({kind: 'FAILED', alertedOn: '2026-11-09T12:00:00'}), {key: 'label.creditdecision.exceptions.next.alerted', at: '2026-11-09T12:00:00'});
    assert.equal(log.exceptionNext({kind: 'FAILED'}).key, 'label.creditdecision.exceptions.next.manual');
    assert.equal(log.exceptionNext({kind: 'HELD', nextRetryOn: '2026-11-09T10:05:00'}).key, 'label.creditdecision.exceptions.next.held');
    assert.equal(log.exceptionNext({kind: 'STUCK'}).key, 'label.creditdecision.exceptions.next.stuck');
    assert.equal(log.exceptionDot({kind: 'FAILED'}), 'nogo');
    assert.equal(log.exceptionDot({kind: 'HELD'}), 'review');
});
