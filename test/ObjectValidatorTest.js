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
    describe('#addConstraint', function() {
        it('should add a constraint', function() {
            var validator = new ObjectValidator();

            validator.addConstraint('string', constraints.string);

            expect(validator.constraints).to.include.keys('string');
        });

        it('should override constraints with the same identifier', function() {
            var validator = new ObjectValidator();

            validator.addConstraint('string', constraints.string);
            validator.addConstraint('string', constraints.dummy);

            expect(validator.constraints).to.include.keys('string');
            expect(validator.constraints['string']).to.not.equal(constraints.string);
            expect(validator.constraints['string']).to.equal(constraints.dummy);
        });
    });

    describe('#addSchema', function() {
        var schemas = {
            "user": require('test/schema/user.json'),
            "address": require('test/schema/address.json')
        };

        it('should add a schema', function() {
            var validator = new ObjectValidator();

            validator.addSchema('user', schemas.user);

            expect(validator.schemas).to.include.keys('user');
            expect(validator.schemas['user']).to.equal(schemas.user);
        });

        it('should throw an error if a schema identifier is already in use', function() {
            var validator = new ObjectValidator();

            validator.addSchema('user', schemas.user);

            expect(_.bind(validator.addSchema, validator, 'user', schemas.user)).to.throw('Schema user has already been added.');
        }); 

    });

    

    describe('#getSchemaOrThrowError', function() {

        var schemas = {
            "user": require('test/schema/user.json'),
            "address": require('test/schema/address.json')
        };

        it('with valid identifier', function() {
            var validator = new ObjectValidator();
            validator.addSchema('user', schemas.user);
            expect(validator.getSchemaOrThrowError('user')).to.equal(schemas.user);
        });

        it('with invalid identifier', function() {
            var validator = new ObjectValidator();
            var identifier = 'hasNotBeenAddedYet';
            expect(_.bind(validator.getSchemaOrThrowError, validator, identifier)).to.throw('Schema ' + identifier + ' does not exist.'); 
        });
    });

    describe('#getConstraintOrThrowError', function() {
        it('with valid identifier', function() {
            var validator = new ObjectValidator();
            validator.addConstraint('string', constraints.string);
            expect(validator.getConstraintOrThrowError('string')).to.equal(constraints.string);
        });

        it('with invalid identifier', function() {
            var validator = new ObjectValidator();
            var identifier = 'hasNotBeenAddedYet';
            expect(_.bind(validator.getConstraintOrThrowError, validator, identifier)).to.throw('Constraint ' + identifier + ' does not exist.'); 
        });
    });

    describe('#validateObject', function() {

        // Clone schemas before eac it() as schemas will be modified 
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

        it('with no info for a schema key', function() {
            var validator = new ObjectValidator();
            validator.addConstraint('string', constraints.string);

            this.schemas.user.age = {}; // Invalid schema

            var user = {
                "name": "Tim Joseph",
                "age": 20
            };

            var identifier = 'user';
            var key = 'age';
            validator.addSchema(identifier, this.schemas.user);
            expect(_.bind(validator.validateObject, validator, user, identifier)).to.throw('Schema contains an invalid type for key ' + key);
        });

        it('with a schema containing no type for a key', function() {
            var validator = new ObjectValidator();
            validator.addConstraint('string', constraints.string);

            this.schemas.user.age.type = {

            }; // Invalid schema, no type provided

            var user = {
                "name": "Tim Joseph",
                "age": 20
            };

            var identifier = 'user';
            var key = 'age';
            validator.addSchema(identifier, this.schemas.user);
            expect(_.bind(validator.validateObject, validator, user, identifier)).to.throw('Schema contains an invalid type for key ' + key);
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
                "address": {

                }
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

    

    describe('#validateArray', function() {
        it('with a directly given schema', function() {
            var validator = new ObjectValidator();
            var constraint = sinon.spy(constraints.dummy);
            validator.addConstraint('dummy', constraint);

            var scalarArray = [1, 2, 4];

            var result = validator.validateArray(scalarArray, {
                "type": "scalar",
                "constraints": [
                    ["dummy", {}]
                ]
            });

            var expectedResult = [
                {
                    "dummy": true
                },
                {
                    "dummy": true
                },
                {
                    "dummy": true
                }
            ];

            expect(result).to.deep.equal(expectedResult);
            expect(constraint.callCount).to.equal(3);
        });

        it('with a schema identifier', function() {
            var validator = new ObjectValidator();
            validator.addSchema('scalarType', {
                "type": "scalar",
                "constraints": [
                    ["dummy", {}]
                ]
            });

            var constraint = sinon.spy(constraints.dummy);
            validator.addConstraint('dummy', constraint);

            var scalarArray = [1, 2, 4];

            var result = validator.validateArray(scalarArray, "scalarType");

            var expectedResult = [
                {
                    "dummy": true
                },
                {
                    "dummy": true
                },
                {
                    "dummy": true
                }
            ];

            expect(result).to.deep.equal(expectedResult);
            expect(constraint.callCount).to.equal(3);
        });

        it('with an array of objects', function() {
            var validator = new ObjectValidator();
            validator.addSchema('someArray', {
                "type": "object",
                "ref": {
                    "someKey": {
                        "type": "scalar",
                        "constraints": [
                            ["string"]
                        ]
                    }
                }
            });

            var stringConstraint = sinon.spy(constraints.string);
            validator.addConstraint('string', stringConstraint);

            var objectArray = [
                {
                    "someKey": "someValue"
                },
                {
                    "someKey": 1
                }
            ];
            var expectedResult = [
                {
                    "someKey": {
                        "string": true
                    }
                },
                {
                    "someKey": {
                        "string": false
                    }
                }
            ];

            var result = validator.validateArray(objectArray, "someArray");
            expect(result).to.deep.equal(expectedResult);

        });

        it('with a two dimensional array', function() {
            var validator = new ObjectValidator();
            validator.addSchema('mySchema', {
                "type": "array",
                "ref": {
                    "type": "scalar",
                    "constraints": [
                        ["dummy", {}]
                    ]
                }
            });

            var constraint = sinon.spy(constraints.dummy);
            validator.addConstraint('dummy', constraint);

            var twoDimArray = [
                [1, 2],
                [3, 4],
                [5, 6, 7]
            ];
            var expectedResult = [
                [{"dummy": true}, {"dummy": true}],
                [{"dummy": true}, {"dummy": true}],
                [{"dummy": true}, {"dummy": true}, {"dummy": true}]
            ];
            var result = validator.validateArray(twoDimArray, "mySchema");

            expect(result).to.deep.equal(expectedResult);
        });

        it('with a scalar', function() {
            var validator = new ObjectValidator();
            expect(validator.validateArray(1)).to.be.false;
        });

        it('with an object', function() {
            var validator = new ObjectValidator();
            expect(validator.validateArray({})).to.be.false;
        });

    });

    describe('#validateScalar', function() {
        beforeEach(function() {
            this.constraints = {
                "string": sinon.spy(constraints.string),
                "dummy": sinon.spy(constraints.dummy)
            };

            this.validator = new ObjectValidator();
            this.validator.addConstraint('string', this.constraints.string);
            this.validator.addConstraint('dummy', this.constraints.dummy);

            this.constraintConfig = [
                ['string', {}],
                ['dummy']
            ];
        });

        it('with an object', function() {
            expect(this.validator.validateScalar({}, this.constraintConfig)).to.be.false;
            expect(this.constraints.string.callCount).to.equal(0);
            expect(this.constraints.dummy.callCount).to.equal(0);
        });

        it('with no constraints', function() {
            expect(this.validator.validateScalar(1)).to.be.true;
            expect(this.constraints.string.callCount).to.equal(0);
            expect(this.constraints.dummy.callCount).to.equal(0);
        });

        it('with constraints', function() {
            var expectedResult = {
                "string": false,
                "dummy": true
            };
            expect(this.validator.validateScalar(1, this.constraintConfig)).to.be.deep.equal(expectedResult);
        });
    });

});