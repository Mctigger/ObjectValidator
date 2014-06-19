require("rootpath")();

var expect = require("chai").expect;
var sinon = require('sinon');
var _ = require('lodash');

var constraints = {
    "string": require('test/constraint/string'),
    "dummy": require('test/constraint/dummy')
};

var ObjectValidator = require('lib/ObjectValidator');


describe('ObjectValidator', function() {

    beforeEach(function() {
        this.schemas = {
            "user": _.cloneDeep(require('test/schema/user.json')),
            "address": _.cloneDeep(require('test/schema/address.json'))
        };
        this.constraints = {
            "string": _.cloneDeep(require('test/constraint/string')),
            "dummy": _.cloneDeep(require('test/constraint/dummy'))
        };
    });

    describe('#validateObject', function() {
        it('with no info for a schema key', function() {
            var validator = new ObjectValidator();
            validator.addConstraint('string', this.constraints.string);

            this.schemas.user.age = {}; // Invalid schema

            var user = {
                "name": "Tim Joseph",
                "age": 20
            };

            var identifier = 'user';
            var key = 'age';
            validator.addSchema(identifier, this.schemas.user);
            expect(_.bind(validator.validateObject, validator, user, identifier)).to.throw('A schema contains the invalid type "undefined"');
        });

        it('with a schema containing no type for a key', function() {
            var validator = new ObjectValidator();
            validator.addConstraint('string', this.constraints.string);

            this.schemas.user.age.type = {}; // Invalid schema, no type provided

            var user = {
                "name": "Tim Joseph",
                "age": 20
            };

            var identifier = 'user';
            var key = 'age';
            validator.addSchema(identifier, this.schemas.user);
            expect(_.bind(validator.validateObject, validator, user, identifier)).to.throw('A schema contains the invalid type "' + {} + '"');
        });

        it('with a valid object and a schema identifier', function() {
            var stringConstraint = sinon.spy(this.constraints.string);
            var dummyConstraint = sinon.spy(this.constraints.dummy);

            var validator = new ObjectValidator();
            validator.addConstraint('string', stringConstraint);
            validator.addConstraint('dummy', sinon.spy(this.constraints.dummy));

            var user = {
                "username": "Tim Joseph",
                "age": 20,
                "address": {}
            };

            validator.addSchema('user', this.schemas.user);
            validator.addSchema('address', this.schemas.address);

            var result = validator.validateObject(user, 'user');
            var expectedResult = {
                "username": {
                    "string": true
                },
                "age": {
                    "string": false
                },
                "address": {
                    "addressee": false,
                    "street": false,
                    "housenumber": false
                }
            };

            expect(result).to.deep.equal(expectedResult);
            expect(stringConstraint.callCount).to.equal(2);
            expect(dummyConstraint.callCount).to.equal(0);
        });

        it('with a valid object and a schema object containing a reference', function() {
            var stringConstraint = sinon.spy(this.constraints.string);
            var dummyConstraint = sinon.spy(this.constraints.dummy);

            var validator = new ObjectValidator();
            validator.addConstraint('string', stringConstraint);
            validator.addConstraint('dummy', sinon.spy(this.constraints.dummy));

            var user = {
                "username": "Tim Joseph",
                "age": 20,
                "address": {

                }
            };

            validator.addSchema('address', this.schemas.address);

            var result = validator.validateObject(user, this.schemas.user);
            var expectedResult = {
                "username": {
                    "string": true
                },
                "age": {
                    "string": false
                },
                "address": {
                    "addressee": false,
                    "street": false,
                    "housenumber": false
                }
            };

            expect(result).to.deep.equal(expectedResult);
            expect(stringConstraint.callCount).to.equal(2);
            expect(dummyConstraint.callCount).to.equal(0);
        });

        it('with a valid object and a schema object containing a schema object', function() {
            var stringConstraint = sinon.spy(this.constraints.string);
            var dummyConstraint = sinon.spy(this.constraints.dummy);

            var validator = new ObjectValidator();
            validator.addConstraint('string', stringConstraint);
            validator.addConstraint('dummy', sinon.spy(this.constraints.dummy));

            var user = {
                "username": "Tim Joseph",
                "age": 20,
                "address": {

                }
            };

            this.schemas.user.address = {
                "type": "object",
                "ref": this.schemas.address
            };
            var result = validator.validateObject(user, this.schemas.user);
            var expectedResult = {
                "username": {
                    "string": true
                },
                "age": {
                    "string": false
                },
                "address": {
                    "addressee": false,
                    "street": false,
                    "housenumber": false
                }
            };

            expect(result).to.deep.equal(expectedResult);
            expect(stringConstraint.callCount).to.equal(2);
            expect(dummyConstraint.callCount).to.equal(0);
        });

        it('with a object containing an array', function() {
            var validator = new ObjectValidator();
            validator.addConstraint('string', this.constraints.string);

            var schema = {
                "someArray": {
                    "type": "array",
                    "ref": {
                        "type": "scalar",
                        "constraints": [
                            ["string"]
                        ]
                    }
                }                
            };

            var object = {
                "someArray": [
                    1, 2, "astring", 4
                ]
            };

            var expectedResult = {
                "someArray": [
                    {
                        "string": false
                    },
                    {
                        "string": false
                    },
                    {
                        "string": true
                    },
                    {
                        "string": false
                    }
                ]
            };

            expect(validator.validateObject(object, schema)).to.deep.equal(expectedResult);
        });

        it('with a schema without constraints', function() {
            var schema = {
                "someScalar": {
                    "type": "scalar",
                    "constraints": []
                }
            };

            var validator = new ObjectValidator();
            validator.addSchema('myScalarObject', schema);

            var aScalarObject = {
                "someScalar": 1
            };

            var expectedResult = {
                "someScalar": true
            };

            expect(validator.validateObject(aScalarObject, 'myScalarObject')).to.deep.equal(expectedResult);
        });

    });
});