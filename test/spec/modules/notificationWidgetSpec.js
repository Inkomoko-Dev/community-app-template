describe('notificationWidget error banner', function () {
    var $http, $httpBackend, $rootScope, $q;

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

    beforeEach(inject(function (_$http_, _$httpBackend_, _$rootScope_, _$q_) {
        $http = _$http_;
        $httpBackend = _$httpBackend_;
        $rootScope = _$rootScope_;
        $q = _$q_;
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
});
