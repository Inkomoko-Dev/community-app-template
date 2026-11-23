describe("CreateUserController", function () {
    var scope, saveCalls;

    beforeEach(function () {
        saveCalls = [];
        scope = {
            $watch: jasmine.createSpy("$watch"),
            hasPermission: function () { return true; }
        };
        var resourceFactory = {
            userTemplateResource: {
                get: jasmine.createSpy("userTemplateResource.get").andCallFake(function (callback) {
                    callback({ allowedOffices: [{ id: 1, name: "Head Office" }], availableRoles: [{ id: 3, name: "Investment Officer" }] });
                })
            },
            userListResource: {
                save: jasmine.createSpy("userListResource.save").andCallFake(function (payload) {
                    saveCalls.push(angular.copy(payload));
                })
            },
            employeeResource: { getAllEmployees: jasmine.createSpy("getAllEmployees") }
        };
        new mifosX.controllers.CreateUserController(scope, resourceFactory, jasmine.createSpyObj("location", ["path"]));
        scope.selectedRoles = [{ id: 3, name: "Investment Officer" }];
    });

    it("sends each selected role once when Save is clicked again after a failed attempt", function () {
        scope.submit();
        scope.submit();

        expect(saveCalls.length).toBe(2);
        expect(saveCalls[0].roles).toEqual([3]);
        expect(saveCalls[1].roles).toEqual([3]);
    });
});
