describe("Undo write-off audit trail", function () {
    var writeOffReversal = {
        id: 77,
        type: { id: 33, code: "loanTransactionType.writeOffReversal", value: "Write-off Reversal" },
        date: [2026, 6, 3],
        amount: 105466.56,
        reversalTransaction: true,
        reversed: false,
        manuallyReversed: false,
        originalTransactionId: 9,
        createdByUsername: "guylaine@inkomoko.com"
    };

    describe("ViewLoanDetailsController", function () {
        var scope;

        beforeEach(function () {
            scope = { $on: jasmine.createSpy("$on"), optlang: { code: "en" }, df: "dd MMMM yyyy" };
            var resourceFactory = {
                LoanAccountResource: {
                    getLoanAccountDetails: jasmine.createSpy("getLoanAccountDetails"),
                    delete: jasmine.createSpy("delete")
                },
                standingInstructionTemplateResource: { get: jasmine.createSpy("get") },
                standingInstructionResource: { search: jasmine.createSpy("search") },
                creditBureauByLoanProductId: { get: jasmine.createSpy("get") },
                loanResource: {
                    getAllNotes: jasmine.createSpy("getAllNotes").andCallFake(function (params, callback) { callback([]); }),
                    save: jasmine.createSpy("save")
                },
                DataTablesResource: {
                    getAllDataTables: jasmine.createSpy("getAllDataTables").andCallFake(function (params, callback) { callback([]); }),
                    getTableDetails: jasmine.createSpy("getTableDetails")
                }
            };
            var interval = jasmine.createSpy("interval").andReturn(1);
            interval.cancel = jasmine.createSpy("interval.cancel");

            new mifosX.controllers.ViewLoanDetailsController(scope, { id: 393409 }, resourceFactory,
                { paginate: jasmine.createSpy("paginate").andReturn({ currentPageItems: [] }) },
                jasmine.createSpyObj("location", ["path"]), jasmine.createSpyObj("route", ["reload"]), {},
                jasmine.createSpyObj("$uibModal", ["open"]), function () { return ""; }, "/api/v1", {}, {},
                {}, interval, { get: jasmine.createSpy("webStorage.get") },
                { getFromLocalStorage: jasmine.createSpy("getFromLocalStorage") });
        });

        it("opens the details of a write-off reversal from the transactions tab", function () {
            expect(scope.canViewTransaction(writeOffReversal)).toBe(true);
        });

        it("shows the link back to the original write-off in the audit column", function () {
            expect(scope.showTransactionAuditInfo(writeOffReversal)).toBe(true);
        });

        it("links an undone write-off row to its write-off reversal", function () {
            scope.reversalTransactionsByOriginalId = { 9: writeOffReversal };

            expect(scope.getReversalTransaction({ id: 9, type: { id: 6, value: "Write-Off" }, reversed: true, manuallyReversed: false }))
                .toBe(writeOffReversal);
        });
    });

    describe("ViewLoanTransactionController", function () {
        var scope, resourceFactory, uibModal, location, transactionCallback;

        beforeEach(function () {
            scope = { optlang: { code: "en" }, df: "dd MMMM yyyy" };
            resourceFactory = {
                configurationResource: { get: jasmine.createSpy("configurationResource.get") },
                loanTrxnsResource: {
                    get: jasmine.createSpy("loanTrxnsResource.get").andCallFake(function (params, callback) {
                        transactionCallback = callback;
                    }),
                    save: jasmine.createSpy("loanTrxnsResource.save").andCallFake(function (params, payload, callback) {
                        callback({ loanId: params.loanId });
                    })
                },
                loanResource: { get: jasmine.createSpy("loanResource.get") },
                LoanAccountResource: {
                    getLoanAccountDetails: jasmine.createSpy("getLoanAccountDetails").andCallFake(function (params, callback) {
                        callback({ transactions: [writeOffReversal] });
                    })
                }
            };
            uibModal = jasmine.createSpyObj("$uibModal", ["open"]);
            location = jasmine.createSpyObj("location", ["path"]);

            new mifosX.controllers.ViewLoanTransactionController(scope, resourceFactory, location,
                { accountId: 393409, id: 9 }, function (date, format) { return "03 June 2026"; }, uibModal, {});
        });

        function undoThroughModal(transaction, note) {
            scope.transaction = transaction;
            scope.undo(393409, transaction.id);
            var modalOptions = uibModal.open.mostRecentCall.args[0];
            var modalScope = {};
            var modalInstance = jasmine.createSpyObj("$uibModalInstance", ["close", "dismiss"]);
            modalOptions.controller(modalScope, modalInstance, 393409, transaction.id);
            modalScope.note = note;
            modalScope.undoTransaction();
            return resourceFactory.loanTrxnsResource.save.mostRecentCall;
        }

        it("sends the note typed in the undo modal with the undo write-off command", function () {
            var call = undoThroughModal({ id: 9, type: { id: 6, value: "Write-Off" } }, "Recovered after branch dispute review");

            expect(call.args[0]).toEqual({ loanId: 393409, command: "undowriteoff" });
            expect(call.args[1]).toBeDefined();
            expect(call.args[1].note).toBe("Recovered after branch dispute review");
            expect(call.args[1].notes).toBe("Recovered after branch dispute review");
        });

        it("shows the write-off reversal on the detail page of the undone write-off", function () {
            transactionCallback({ id: 9, type: { id: 6, value: "Write-Off" }, reversed: true, manuallyReversed: false,
                principalPortion: 90000, interestPortion: 15466.56, feeChargesPortion: 0, penaltyChargesPortion: 0 });

            expect(scope.relatedReversal).toBe(writeOffReversal);
        });

        it("does not offer undo on a write-off reversal", function () {
            expect(scope.canUndoTransaction(writeOffReversal)).toBe(false);
        });

        it("does not offer undo on a write-off that has already been undone", function () {
            expect(scope.canUndoTransaction({ id: 9, type: { id: 6, value: "Write-Off" }, reversed: true })).toBe(false);
        });

        it("still offers undo on a live write-off", function () {
            expect(scope.canUndoTransaction({ id: 9, type: { id: 6, value: "Write-Off" }, reversed: false })).toBe(true);
        });
    });
});
