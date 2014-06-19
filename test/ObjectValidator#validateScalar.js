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