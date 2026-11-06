describe('notificationWidget error banner', function () {
    var $http, $httpBackend, $rootScope, $q, $compile, $timeout;

    var notAuthorized = {
        httpStatusCode: '403',
        defaultUserMessage: 'You are not authorized to perform this action.',
        userMessageGlobalisationCode: 'error.msg.not.authorized',
        errors: [{
            defaultUserMessage: 'You are not authorized to perform this action.',
            userMessageGlobalisationCode: 'error.msg.not.authorized',
            parameterName: 'id'
        }]
    };

    var usernameTaken = {
        httpStatusCode: '403',
        defaultUserMessage: 'User with username inkomoko already exists.',
        userMessageGlobalisationCode: 'error.msg.user.duplicate.username',
        errors: [{
            defaultUserMessage: 'User with username inkomoko already exists.',
            userMessageGlobalisationCode: 'error.msg.user.duplicate.username',
            parameterName: 'username'
        }]
    };

    function bannerShowing() {
        return !!($rootScope.errorStatus || ($rootScope.errorDetails && $rootScope.errorDetails.length));
    }

    function bannerText() {
        var text = [$rootScope.errorStatus || ''];
        angular.forEach($rootScope.errorDetails || [], function (detail) {
            text.push(detail.message || detail.defaultUserMessage || detail.code || '');
        });
        return text.join(' ').trim();
    }

    function send(method, url, data) {
        return $http({method: method, url: url, data: data}).catch(angular.noop);
    }

    beforeEach(function () {
        $ = jQuery = jasmine.createSpy('jQuery').andReturn({remove: angular.noop, removeClass: angular.noop});
    });

    beforeEach(module('notificationWidget'));

    beforeEach(inject(function (_$http_, _$httpBackend_, _$rootScope_, _$q_, _$compile_, _$timeout_) {
        $http = _$http_;
        $httpBackend = _$httpBackend_;
        $rootScope = _$rootScope_;
        $q = _$q_;
        $compile = _$compile_;
        $timeout = _$timeout_;
    }));

    afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    describe('background lookups', function () {
        it('shows the banner when a lookup is refused', function () {
            $httpBackend.expectGET('/fineract-provider/api/v1/staff?officeId=1').respond(403, notAuthorized);
            send('GET', '/fineract-provider/api/v1/staff?officeId=1');
            $httpBackend.flush();

            expect(bannerText()).toContain('You are not authorized to perform this action.');
        });

        it('clears a refused lookup once the same lookup succeeds', function () {
            $httpBackend.expectGET('/fineract-provider/api/v1/staff?officeId=1').respond(403, notAuthorized);
            send('GET', '/fineract-provider/api/v1/staff?officeId=1');
            $httpBackend.flush();

            $httpBackend.expectGET('/fineract-provider/api/v1/staff?officeId=1').respond(200, []);
            send('GET', '/fineract-provider/api/v1/staff?officeId=1');
            $httpBackend.flush();

            expect(bannerShowing()).toBe(false);
        });

        it('keeps a failed page load visible while the other lookups on the page succeed', function () {
            $httpBackend.expectGET('/fineract-provider/api/v1/loans/999999?associations=all').respond(404, {
                httpStatusCode: '404',
                defaultUserMessage: 'Loan with identifier 999999 does not exist',
                userMessageGlobalisationCode: 'error.msg.loan.id.invalid',
                errors: [{
                    defaultUserMessage: 'Loan with identifier 999999 does not exist',
                    userMessageGlobalisationCode: 'error.msg.loan.id.invalid',
                    parameterName: 'id'
                }]
            });
            send('GET', '/fineract-provider/api/v1/loans/999999?associations=all');
            $httpBackend.flush();

            $httpBackend.expectGET('/fineract-provider/api/v1/datatables?apptable=m_loan').respond(200, []);
            send('GET', '/fineract-provider/api/v1/datatables?apptable=m_loan');
            $httpBackend.flush();

            expect(bannerText()).toContain('Loan with identifier 999999 does not exist');
        });

        it('clears a refused lookup once the user action succeeds', function () {
            $httpBackend.expectGET('/fineract-provider/api/v1/staff?officeId=1').respond(403, notAuthorized);
            send('GET', '/fineract-provider/api/v1/staff?officeId=1');
            $httpBackend.flush();

            $httpBackend.expectPOST('/fineract-provider/api/v1/users').respond(200, {resourceId: 99});
            send('POST', '/fineract-provider/api/v1/users', {username: 'newuser'});
            $httpBackend.flush();

            expect(bannerShowing()).toBe(false);
        });

        it('clears a dropped loan refresh once the next refresh succeeds', function () {
            $httpBackend.expectGET('/fineract-provider/api/v1/loans/430743?associations=all').respond(function () {
                return [-1, null, {}, '', 'error'];
            });
            send('GET', '/fineract-provider/api/v1/loans/430743?associations=all');
            $httpBackend.flush();
            expect(bannerText()).toContain('No connection');

            $httpBackend.expectGET('/fineract-provider/api/v1/loans/430743?associations=all').respond(200, {id: 430743});
            send('GET', '/fineract-provider/api/v1/loans/430743?associations=all');
            $httpBackend.flush();

            expect(bannerShowing()).toBe(false);
        });
    });

    describe('cancelled requests', function () {
        it('does not report a cancelled request as a lost connection', function () {
            var cancel = $q.defer();
            $httpBackend.expectGET('/fineract-provider/api/v1/clients?offset=0').respond(200, []);
            $http({method: 'GET', url: '/fineract-provider/api/v1/clients?offset=0', timeout: cancel.promise}).catch(angular.noop);
            cancel.resolve();
            $rootScope.$digest();

            expect(bannerShowing()).toBe(false);
        });
    });

    describe('errors from the user action', function () {
        it('keeps a save error visible while background refreshes succeed', function () {
            $httpBackend.expectPOST('/fineract-provider/api/v1/users').respond(403, usernameTaken);
            send('POST', '/fineract-provider/api/v1/users', {username: 'inkomoko'});
            $httpBackend.flush();

            $httpBackend.expectGET('/fineract-provider/api/v1/loans/430743?associations=all').respond(200, {id: 430743});
            send('GET', '/fineract-provider/api/v1/loans/430743?associations=all');
            $httpBackend.flush();

            expect(bannerText()).toContain('User with username inkomoko already exists.');
        });

        it('keeps a save error visible when a background refresh fails afterwards', function () {
            $httpBackend.expectPOST('/fineract-provider/api/v1/users').respond(403, usernameTaken);
            send('POST', '/fineract-provider/api/v1/users', {username: 'inkomoko'});
            $httpBackend.flush();

            $httpBackend.expectGET('/fineract-provider/api/v1/loans/historicalpenaltywaivers/loans/432148').respond(403, notAuthorized);
            send('GET', '/fineract-provider/api/v1/loans/historicalpenaltywaivers/loans/432148');
            $httpBackend.flush();

            expect(bannerText()).toContain('User with username inkomoko already exists.');
        });

        it('clears a save error when the same save is retried successfully', function () {
            $httpBackend.expectPOST('/fineract-provider/api/v1/users').respond(403, usernameTaken);
            send('POST', '/fineract-provider/api/v1/users', {username: 'inkomoko'});
            $httpBackend.flush();

            $httpBackend.expectPOST('/fineract-provider/api/v1/users').respond(200, {resourceId: 99});
            send('POST', '/fineract-provider/api/v1/users', {username: 'inkomoko2'});
            $httpBackend.flush();

            expect(bannerShowing()).toBe(false);
        });

        it('reports a genuine network drop on a save', function () {
            $httpBackend.expectPOST('/fineract-provider/api/v1/users').respond(function () {
                return [-1, null, {}, '', 'error'];
            });
            send('POST', '/fineract-provider/api/v1/users', {username: 'newuser'});
            $httpBackend.flush();

            expect(bannerText()).toContain('No connection');
        });

        it('clears every banner when the user moves to another page', function () {
            $httpBackend.expectPOST('/fineract-provider/api/v1/users').respond(403, usernameTaken);
            send('POST', '/fineract-provider/api/v1/users', {username: 'inkomoko'});
            $httpBackend.flush();

            $rootScope.$broadcast('$routeChangeStart');

            expect(bannerShowing()).toBe(false);
        });
    });

    describe('a save clicked twice', function () {
        var returnBody = {note: 'Client asked for a lower amount'};
        var returnUrl = '/fineract-provider/api/v1/loans/decision/prepareAndSignContract/reject/431738';

        it('sends the save only once while the first one is still running', function () {
            $httpBackend.expectPOST(returnUrl, returnBody).respond(200, {loanId: 431738});
            send('POST', returnUrl, returnBody);
            send('POST', returnUrl, returnBody);
            $httpBackend.flush();

            expect(bannerShowing()).toBe(false);
        });

        it('sends the save again when the user retries after it finished', function () {
            $httpBackend.expectPOST(returnUrl, returnBody).respond(400, {errors: [{userMessageGlobalisationCode: 'validation.msg.loan.prepareandsigncontract.reject.note.cannot.be.blank', defaultUserMessage: 'Note is mandatory.', parameterName: 'note'}]});
            send('POST', returnUrl, returnBody);
            $httpBackend.flush();

            $httpBackend.expectPOST(returnUrl, returnBody).respond(200, {loanId: 431738});
            send('POST', returnUrl, returnBody);
            $httpBackend.flush();

            expect(bannerShowing()).toBe(false);
        });

        it('still sends different saves that run at the same time', function () {
            $httpBackend.expectPOST('/fineract-provider/api/v1/datatables/dt_one/431738', {a: 1}).respond(200, {});
            $httpBackend.expectPOST('/fineract-provider/api/v1/datatables/dt_one/431738', {a: 2}).respond(200, {});
            send('POST', '/fineract-provider/api/v1/datatables/dt_one/431738', {a: 1});
            send('POST', '/fineract-provider/api/v1/datatables/dt_one/431738', {a: 2});
            $httpBackend.flush();
        });

        it('does not hold back repeated lookups', function () {
            $httpBackend.expectGET('/fineract-provider/api/v1/offices').respond(200, []);
            $httpBackend.expectGET('/fineract-provider/api/v1/offices').respond(200, []);
            send('GET', '/fineract-provider/api/v1/offices');
            send('GET', '/fineract-provider/api/v1/offices');
            $httpBackend.flush();
        });

        function compileForm(onSubmit) {
            var scope = $rootScope.$new();
            scope.save = onSubmit;
            var element = $compile('<form name="createuserform" novalidate>' +
                '<button id="cancel" type="button">Cancel</button>' +
                '<button id="save" type="submit">Submit</button>' +
                '<button id="locked" type="submit" disabled>Locked</button>' +
                '</form>')(scope);
            element.on('submit', function (event) {
                event.preventDefault();
                scope.$apply(scope.save);
            });
            scope.$digest();
            return element;
        }

        function submit(element) {
            var event = document.createEvent('Event');
            event.initEvent('submit', true, true);
            element[0].dispatchEvent(event);
        }

        function button(element, id) {
            return element[0].querySelector('#' + id);
        }

        it('disables the submit button while the save is running and enables it again when it fails', function () {
            var element = compileForm(function () {
                send('POST', '/fineract-provider/api/v1/users', {username: 'inkomoko'});
            });
            $httpBackend.expectPOST('/fineract-provider/api/v1/users').respond(403, usernameTaken);

            submit(element);
            $timeout.flush();

            expect(button(element, 'save').disabled).toBe(true);
            expect(button(element, 'cancel').disabled).toBe(false);

            $httpBackend.flush();

            expect(button(element, 'save').disabled).toBe(false);
            expect(button(element, 'locked').disabled).toBe(true);
        });

        it('disables a wizard submit button that saves on click without submitting the form', function () {
            var scope = $rootScope.$new();
            var element = $compile('<form name="loanactionform" novalidate>' +
                '<button id="save" type="submit">Save</button>' +
                '</form>')(scope);
            scope.$digest();
            angular.element(button(element, 'save')).on('click', function (event) {
                event.preventDefault();
                scope.$apply(function () {
                    send('POST', returnUrl, returnBody);
                });
            });
            $httpBackend.expectPOST(returnUrl, returnBody).respond(200, {loanId: 431738});

            button(element, 'save').click();
            $timeout.flush();

            expect(button(element, 'save').disabled).toBe(true);

            $httpBackend.flush();

            expect(button(element, 'save').disabled).toBe(false);
        });

                it('disables a wizard submit button whose save starts a moment after the click', function () {
            var scope = $rootScope.$new();
            var element = $compile('<form name="loanactionform" novalidate>' +
                '<button id="save" type="submit">Submit</button>' +
                '</form>')(scope);
            scope.$digest();
            angular.element(button(element, 'save')).on('click', function (event) {
                event.preventDefault();
                $timeout(function () {
                    send('POST', returnUrl, returnBody);
                }, 50);
            });
            $httpBackend.expectPOST(returnUrl, returnBody).respond(200, {loanId: 431738});

            button(element, 'save').click();
            $timeout.flush();

            expect(button(element, 'save').disabled).toBe(true);

            $httpBackend.flush();

            expect(button(element, 'save').disabled).toBe(false);
        });

                it('disables the wizard submit button when the click arrives wrapped by jQuery', function () {
            var scope = $rootScope.$new();
            var element = $compile('<form name="loanactionform" novalidate>' +
                '<button id="save" type="submit">Submit</button>' +
                '</form>')(scope);
            scope.$digest();
            $httpBackend.expectPOST(returnUrl, returnBody).respond(200, {loanId: 431738});
            send('POST', returnUrl, returnBody);
            $rootScope.$digest();

            element.triggerHandler({
                type: 'click',
                target: button(element, 'save'),
                isDefaultPrevented: function () {
                    return true;
                }
            });

            expect(button(element, 'save').disabled).toBe(true);

            $httpBackend.flush();

            expect(button(element, 'save').disabled).toBe(false);
        });

                it('leaves the submit button alone when the form sends nothing', function () {
            var element = compileForm(angular.noop);

            submit(element);
            $timeout.flush();

            expect(button(element, 'save').disabled).toBe(false);
        });
    });
});
