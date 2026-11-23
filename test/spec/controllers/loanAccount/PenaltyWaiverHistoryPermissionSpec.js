describe("ViewLoanDetailsController penalty waiver history", function () {
    var resourceFactory;

    function approvedLoan() {
        return {
            id: 432148,
            accountNo: "000432148",
            clientId: 881783,
            loanProductId: 10,
            currency: { code: "ETB", decimalPlaces: 2 },
            status: { id: 200, value: "Approved" },
            subStatus: { id: 0, value: "" },
            repaymentSchedule: { totalWaived: 0 },
            timeline: { submittedOnDate: [2026, 7, 1] },
            charges: [],
            transactions: [],
            isExtendLoanLifeCycleConfig: false,
            recalculateInterest: false
        };
    }

    function autoResource(name) {
        return new Proxy({}, {
            get: function (target, method) {
                if (!target[method]) {
                    target[method] = jasmine.createSpy(name + "." + String(method));
                }
                return target[method];
            }
        });
    }

    function openLoanAs(permissions) {
        var scope = {
            $on: jasmine.createSpy("$on"),
            $watch: jasmine.createSpy("$watch"),
            optlang: { code: "en" },
            df: "dd MMMM yyyy",
            hasPermission: function (permission) {
                if (permissions.indexOf("ALL_FUNCTIONS") !== -1) {
                    return true;
                }
                if (permission.indexOf("READ_") === 0 && permissions.indexOf("ALL_FUNCTIONS_READ") !== -1) {
                    return true;
                }
                return permissions.indexOf(permission) !== -1;
            }
        };
        var resources = {
            LoanAccountResource: {
                getLoanAccountDetails: jasmine.createSpy("getLoanAccountDetails").andCallFake(function (params, callback) {
                    callback(approvedLoan());
                }),
                delete: jasmine.createSpy("delete")
            },
            loanResource: autoResource("loanResource"),
            DataTablesResource: {
                getAllDataTables: jasmine.createSpy("getAllDataTables").andCallFake(function (params, callback) { callback([]); }),
                getTableDetails: jasmine.createSpy("getTableDetails")
            }
        };
        resourceFactory = new Proxy(resources, {
            get: function (target, name) {
                if (!target[name]) {
                    target[name] = autoResource(String(name));
                }
                return target[name];
            }
        });
        var interval = jasmine.createSpy("interval").andReturn(1);
        interval.cancel = jasmine.createSpy("interval.cancel");

        try {
            new mifosX.controllers.ViewLoanDetailsController(scope, { id: 432148 }, resourceFactory,
                { paginate: jasmine.createSpy("paginate").andReturn({ currentPageItems: [] }) },
                jasmine.createSpyObj("location", ["path"]), jasmine.createSpyObj("route", ["reload"]), {},
                jasmine.createSpyObj("$uibModal", ["open"]), function () { return ""; }, "/api/v1", {}, {},
                {}, interval, { get: jasmine.createSpy("webStorage.get") },
                { getFromLocalStorage: jasmine.createSpy("getFromLocalStorage") });
        } catch (ignore) {
        }
        return resourceFactory.historicalPenaltyWaiversByLoanResource.getAll;
    }

    it("does not ask for the waiver history when the user may not read it", function () {
        var lookup = openLoanAs(["READ_LOAN"]);

        expect(lookup).not.toHaveBeenCalled();
    });

    it("loads the waiver history for a user who may read it", function () {
        var lookup = openLoanAs(["READ_LOAN", "READ_HISTORICALPENALTYWAIVER"]);

        expect(lookup).toHaveBeenCalled();
        expect(lookup.mostRecentCall.args[0]).toEqual({ loanId: 432148 });
    });

    it("loads the waiver history for a user with all read rights", function () {
        var lookup = openLoanAs(["ALL_FUNCTIONS_READ"]);

        expect(lookup).toHaveBeenCalled();
    });
});
