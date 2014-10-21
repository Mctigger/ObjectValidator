require("rootpath")();

var expect = require("chai").expect;
var sinon = require('sinon');
var _ = require('lodash');

var constraints = {
    "string": require('test/constraint/string'),
    "dummy": require('test/constraint/dummy')
};

var ObjectValidator = require('src/ObjectValidator');

describe('ObjectValidator', function() {
    describe('.addConstraint', function() {
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

    describe('.addSchema', function() {
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



    describe('.getSchemaOrThrowError', function() {

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

    describe('.getConstraintOrThrowError', function() {
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




    describe('.validateArray', function() {
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



});