describe("RunReportsController", function () {
    var calls, dateFilter, today;

    function row(name, variable, displayType, formatType, defaultVal, selectAll, parent) {
        return {row: [name, variable, variable, displayType, formatType, defaultVal, null, selectAll || null, parent || null]};
    }

    function respond(reportSource, rows) {
        for (var i in calls) {
            if (calls[i].params.reportSource === reportSource) {
                calls[i].callback({data: rows});
                return;
            }
        }
        throw "no request for " + reportSource;
    }

    function options(pairs) {
        return pairs.map(function (p) { return {row: p}; });
    }

    beforeEach(function () {
        calls = [];
        $ = jQuery = jasmine.createSpy('jQuery').andReturn({each: function () {}, addClass: function () {}, removeClass: function () {}});
        today = '2026-09-24';
        dateFilter = jasmine.createSpy('dateFilter').andCallFake(function (value) {
            return value instanceof Date ? today : value;
        });
        this.scope = {};
        this.resourceFactory = {
            runReportsResource: {
                getReport: jasmine.createSpy('getReport').andCallFake(function (params, callback) {
                    calls.push({params: params, callback: callback});
                })
            },
            reportsResource: {get: jasmine.createSpy('reportsResource.get')}
        };
        this.controller = new mifosX.controllers.RunReportsController(this.scope, {name: 'Repeat Loan Pipeline Eligibility', type: 'Table', reportId: 1},
            this.resourceFactory, {}, dateFilter, {}, 'v1', {}, {}, {});

        respond('FullParameterList', [
            row('OfficeIdSelectOne', 'officeId', 'select', 'number', '0', null),
            row('latestLoanStatusSelectAll', 'latestLoanStatusId', 'select', 'number', '-1', 'Y'),
            row('excludeActiveLoansSelect', 'excludeActiveLoans', 'select', 'number', '1', 'N'),
            row('strataIdSelectAll', 'strataId', 'select', 'number', 'n/a', 'Y'),
            row('minLoanCycle', 'minLoanCycle', 'text', 'number', '2'),
            row('payOffStartDateSelect', 'startDate', 'date', 'date', '2015-01-01'),
            row('payOffEndDateSelect', 'endDate', 'date', 'date', 'today'),
            row('provinceIdSelectAll', 'provinceId', 'date', 'date', 'n/a')
        ]);
        respond('OfficeIdSelectOne', options([[1, 'Head Office'], [2, 'Rwanda']]));
        respond('latestLoanStatusSelectAll', options([[600, 'Closed (obligations met)'], [700, 'Overpaid']]));
        respond('excludeActiveLoansSelect', options([[1, 'Yes'], [0, 'No']]));
        respond('strataIdSelectAll', options([[501, 'Host Community'], [502, 'Refugee']]));
    });

    it("pre-fills a select with its configured default, including All", function () {
        expect(this.scope.formData.R_latestLoanStatusId).toBe('-1');
        expect(this.scope.formData.R_excludeActiveLoans).toBe(1);
    });

    it("leaves a select empty when its default is not one of the options", function () {
        expect(this.scope.formData.R_officeId).toBeUndefined();
        expect(this.scope.formData.R_strataId).toBeUndefined();
    });

    it("pre-fills text and date parameters from their defaults", function () {
        expect(this.scope.formData.R_minLoanCycle).toBe('2');
        expect(this.scope.formData.R_startDate).toBe('2015-01-01');
        expect(this.scope.formData.R_endDate).toBe(today);
        expect(this.scope.formData.R_provinceId).toBeUndefined();
    });

    it("does not overwrite a value the user already chose when options reload", function () {
        this.scope.formData.R_latestLoanStatusId = 700;
        respond('latestLoanStatusSelectAll', options([[600, 'Closed (obligations met)'], [700, 'Overpaid']]));
        expect(this.scope.formData.R_latestLoanStatusId).toBe(700);
    });

    it("rejects a non-numeric value in a number text parameter", function () {
        this.scope.formData.R_officeId = 1;
        this.scope.formData.R_strataId = '-1';
        this.scope.formData.R_provinceId = '2026-01-01';
        this.scope.formData.R_minLoanCycle = 'abc';
        this.scope.getResultsPage(1);
        var codes = this.scope.errorDetails.map(function (e) { return e.code; });
        expect(codes).toEqual(['error.message.report.invalid.value.for.parameter']);
    });

    it("runs the report when the number text parameter holds digits", function () {
        this.scope.formData.R_officeId = 1;
        this.scope.formData.R_strataId = '-1';
        this.scope.formData.R_provinceId = '2026-01-01';
        this.scope.formData.R_minLoanCycle = '3';
        this.scope.getResultsPage(1);
        expect(this.scope.errorDetails).toEqual([]);
        var last = calls[calls.length - 1].params;
        expect(last.R_minLoanCycle).toBe('3');
        expect(last.R_latestLoanStatusId).toBe('-1');
        expect(last.R_startDate).toBe('2015-01-01');
    });
});
