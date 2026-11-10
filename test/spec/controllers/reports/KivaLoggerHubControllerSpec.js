describe("KivaLoggerHubController", function () {
    var calls, scope, http, resourceFactory, dateFilter;

    function lastCall() {
        return calls[calls.length - 1];
    }

    beforeEach(function () {
        calls = [];
        scope = {$watchGroup: jasmine.createSpy('$watchGroup')};
        dateFilter = jasmine.createSpy('dateFilter').andCallFake(function (value) {
            return value instanceof Date ? value.toISOString().substring(0, 10) : value;
        });
        http = {
            get: jasmine.createSpy('http.get').andReturn({then: function () { return {finally: function () {}}; }})
        };
        resourceFactory = {
            runReportsResource: {
                getReport: jasmine.createSpy('getReport').andCallFake(function (params, success, failure) {
                    calls.push({params: params, success: success, failure: failure});
                })
            },
            officeResource: {
                getAllOffices: jasmine.createSpy('getAllOffices').andCallFake(function (callback) {
                    callback([{id: 3, name: 'Kenya', nameDecorated: '....Kenya'}, {id: 77, name: 'Kakuma', nameDecorated: '........Kakuma'}]);
                })
            }
        };
        new mifosX.controllers.KivaLoggerHubController(scope, {hostUrl: 'https://cbs'}, http, '/fineract-provider/api/v1',
            resourceFactory, dateFilter, {open: jasmine.createSpy('open').andReturn({result: {then: function () {}}})});
    });

    it("loads the first page of the Kiva Posting Report with every filter open", function () {
        expect(calls.length).toBe(1);
        expect(lastCall().params).toEqual({
            reportSource: 'Kiva Posting Report',
            R_status: 'all',
            R_officeIds: 'all',
            R_disbursedFrom: '',
            R_disbursedTo: '',
            R_postedFrom: '',
            R_postedTo: '',
            R_orderBy: 'id',
            R_sortOrder: 'desc',
            limit: 10,
            offset: 0,
            includeCount: true
        });
    });

    it("sends only the story's filters, combined, in the shape the report SQL expects", function () {
        scope.filters.postedFrom = new Date('2026-08-01T00:00:00Z');
        scope.filters.postedTo = new Date('2026-08-12T00:00:00Z');
        scope.filters.status = 'notposted';
        scope.officeToAdd = 3;
        scope.addOffice();
        scope.officeToAdd = 77;
        scope.addOffice();
        scope.filters.disbursedFrom = new Date('2026-09-01T00:00:00Z');
        scope.filters.disbursedTo = new Date('2026-09-30T00:00:00Z');
        scope.applyFilters();

        var params = lastCall().params;
        expect(params.R_status).toBe('notposted');
        expect(params.R_officeIds).toBe('-3-77-');
        expect(params.R_disbursedFrom).toBe('2026-09-01');
        expect(params.R_disbursedTo).toBe('2026-09-30');
        expect(params.R_postedFrom).toBe('2026-08-01');
        expect(params.R_postedTo).toBe('2026-08-12');
        expect(params.R_search).toBeUndefined();
        expect(params.R_latestOnly).toBeUndefined();
        expect(params.offset).toBe(0);
        expect(params.includeCount).toBe(true);
    });

    it("maps report columns to rows and keeps the total count", function () {
        lastCall().success({
            columnHeaders: [{columnName: 'ID'}, {columnName: 'Loan Account'}, {columnName: 'Posted / Not Posted'},
                {columnName: 'Message'}, {columnName: 'Raw Error Message'}, {columnName: 'Loan ID'}],
            data: [{row: [9, '000042870', 'Not Posted', 'Profile image is missing', 'Loan profile image not uploaded', 42870]},
                {row: [8, '000042871', 'Posted', 'Posted successfully', null, 42871]}],
            count: 23
        });

        expect(scope.totalRecords).toBe(23);
        expect(scope.rows[0]).toEqual({id: 9, loanAccount: '000042870', status: 'Not Posted', message: 'Profile image is missing',
            rawError: 'Loan profile image not uploaded', loanId: 42870, posted: false});
        expect(scope.rows[1].posted).toBe(true);
    });

    it("ignores a slow earlier response that arrives after a newer one", function () {
        scope.filters.status = 'posted';
        scope.applyFilters();
        var stale = calls[0];
        var latest = lastCall();
        latest.success({columnHeaders: [{columnName: 'ID'}], data: [{row: [2]}], count: 1});
        stale.success({columnHeaders: [{columnName: 'ID'}], data: [{row: [1]}, {row: [3]}], count: 48888});

        expect(scope.totalRecords).toBe(1);
        expect(scope.rows.length).toBe(1);
        expect(scope.rows[0].id).toBe(2);
    });

    it("pages without recounting and resorts from the first page", function () {
        scope.pageChanged(3);
        expect(lastCall().params.offset).toBe(20);
        expect(lastCall().params.includeCount).toBe(false);

        scope.sortBy('disbursed');
        expect(lastCall().params.R_orderBy).toBe('disbursed');
        expect(lastCall().params.R_sortOrder).toBe('desc');
        expect(lastCall().params.offset).toBe(0);

        scope.sortBy('disbursed');
        expect(lastCall().params.R_sortOrder).toBe('asc');
    });

    it("does not run the report while filters are being chosen, only on Apply Filters", function () {
        scope.filters.status = 'notposted';
        scope.officeToAdd = 3;
        scope.addOffice();
        scope.filters.disbursedFrom = new Date('2026-07-01T00:00:00Z');
        expect(calls.length).toBe(1);

        scope.applyFilters();
        expect(calls.length).toBe(2);
        expect(lastCall().params.R_status).toBe('notposted');
        expect(lastCall().params.R_officeIds).toBe('-3-');
        expect(lastCall().params.R_disbursedFrom).toBe('2026-07-01');
    });

    it("removing an office takes effect on the next Apply Filters", function () {
        scope.officeToAdd = 3;
        scope.addOffice();
        scope.applyFilters();
        scope.removeOffice({id: 3});
        expect(scope.availableOffices().length).toBe(2);
        expect(calls.length).toBe(2);

        scope.applyFilters();
        expect(lastCall().params.R_officeIds).toBe('all');
    });

    it("sorts and pages with the applied filters, not ones still being edited", function () {
        scope.filters.status = 'posted';
        scope.applyFilters();
        scope.filters.status = 'notposted';

        scope.sortBy('office');
        expect(lastCall().params.R_status).toBe('posted');
        scope.pageChanged(2);
        expect(lastCall().params.R_status).toBe('posted');
    });

    it("clear filters resets every filter and reloads the full list", function () {
        scope.filters.status = 'posted';
        scope.applyFilters();

        scope.clearFilters();
        expect(scope.filters.status).toBe('all');
        expect(lastCall().params.R_status).toBe('all');
        expect(lastCall().params.includeCount).toBe(true);
    });

    it("exports the rows on screen (the applied filters) unpaged as xlsx", function () {
        scope.filters.status = 'posted';
        scope.applyFilters();
        scope.filters.status = 'notposted';
        scope.exportToXLSX();

        var args = http.get.mostRecentCall.args;
        expect(args[0]).toBe('https://cbs/fineract-provider/api/v1/runreports/Kiva%20Posting%20Report');
        expect(args[1].responseType).toBe('blob');
        expect(args[1].params.exportXLSX).toBe(true);
        expect(args[1].params.R_status).toBe('posted');
        expect(args[1].params.limit).toBeUndefined();
        expect(args[1].params.reportSource).toBeUndefined();
    });
});
