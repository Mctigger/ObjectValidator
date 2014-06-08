var _ = require('lodash');

/**
 * Creates a new ObjectValidator
 * @constructor
 */
function ObjectValidator() {
    this.constraints = {};
    this.schemas = {};
}

/**
 * Adds a constraint to the validator
 * @param {string} identifier
 * @param {function(*, [Object])} constraint
 */
ObjectValidator.prototype.addConstraint = function(identifier, constraint) {
    if(_.has(this.constraints, identifier)) {
        console.log('Constraint with identifier ' + identifier + ' will be overriden by new constraint');
    }   

    this.constraints[identifier] = constraint;
};

/**
 * Adds a schema to the validator
 * @param {string} identifier
 * @param {Object} schema
 */
ObjectValidator.prototype.addSchema = function(identifier, schema) {
    if(_.has(this.schemas, identifier)) {
        throw new Error('Schema ' + identifier + ' has already been added.');
    }

    this.schemas[identifier] = schema;
};

/**
 * Retrieves a schema from the internal schema collection.
 * If the schema does not exist in the collection an error will be thrown
 * @param  {string} identifier
 * @return {Object}
 */
ObjectValidator.prototype.getSchemaOrThrowError = function(identifier) {
    if(!_.has(this.schemas, identifier)) {
        throw new Error('Schema ' + identifier + ' does not exist.');
    }

    return this.schemas[identifier];
};

/**
 * Retrieves a constraint from the internal constraint collection.
 * If the constraint does not exist in the collection an error will be thrown
 * @param  {string} identifier
 * @return {Object}
 */
ObjectValidator.prototype.getConstraintOrThrowError = function(identifier) {
    if(!_.has(this.constraints, identifier)) {
        throw new Error('Constraint ' + identifier + ' does not exist.');
    }

    return this.constraints[identifier];
};

/**
 * Validates an object
 * @param  {*} object The object to be validated
 * @param  {string|Object} identifier Either a schema identifier or the schema itself
 * @return {Object|boolean}
 */
ObjectValidator.prototype.validateObject = function(object, schema) {
    if(!_.isObject(object) || _.isArray(object)) {
        return false;
    }

    if(_.isString(schema)) {
        schema = this.getSchemaOrThrowError(schema);
    }

    // Clone schema so the registered one does not change when deleting entries
    schema = _.cloneDeep(schema);
    
    var result = {};
    // Iterate over object keys/values
    _.each(object, function(value, key, list) {
        // If the schema DOES contain the key, keep validating
        if(_.has(schema, key)) {
            switch (schema[key].type) {
                case 'object':
                    result[key] = this.validateObject(value, schema[key].ref);
                    break;
                case 'array':
                    result[key] = this.validateArray(value, schema[key].ref);
                    break;
                case 'scalar':
                    result[key] = this.validateScalar(value, schema[key].constraints);
                    break;
                default:
                    throw new Error('Schema contains an invalid type for key ' + key);
            }
            delete schema[key];
        }
        // If the schema DOES NOT contain the key, stop validating and set false
        else {
            result[key] = false;
        }
    }, this);

    // Add missing key/values to the result
    if(_.size(schema) > 0) {
        _.each(schema, function(value, key, list) {
            result[key] = false;
        }, this);
    }

    return result;
};

/**
 * Validates an array
 * @param  {*} array The array to be validated 
 * @param  {Object|string} Either the schema identifier for the array elements or the schema itself
 * @return {Array|boolean}
 */
ObjectValidator.prototype.validateArray = function(array, schema) {
    if(!_.isArray(array)) {
        return false;
    }

    if(_.isString(schema)) {
        schema = this.getSchemaOrThrowError(schema);
    }

    // Clone schema so the registered one does not change when deleting entries
    schema = _.cloneDeep(schema);

    // validateElement contains the function for the in the schema specified type
    var validateElement;
    switch (schema.type) {
        case 'object':
            validateElement = _.partialRight(_.bind(this.validateObject, this), schema.ref);            
            break;
        case 'array':
            validateElement = _.partialRight(_.bind(this.validateArray, this), schema.ref);
            break;
        case 'scalar':
            validateElement = _.partialRight(_.bind(this.validateScalar, this), schema.constraints);
            break;
        default:
            throw new Error('Schema ' + schema + ' contains an invalid type for array ' + array);
    }

    var result = [];

    // Validate each element of the array
    _.each(array, function(element, index, list) {
        result[index] = validateElement(element);
    }, this);

    return result;
};

/**
 * Validates a scalar by calling the associated constraints
 * @param  {*} value The value to be validated
 * @param  {Array.<Array>} An array of constraint configs [constraintname, options]
 * @return {Object|boolean}
 */
ObjectValidator.prototype.validateScalar = function(value, constraints) {
    // If the given value is not a scalar, return false
    if(_.isObject(value)) {
        return false;
    }
    // No constraints mean there is which can validate false
    if(_.size(constraints) === 0) {
        return true;
    }

    var resultSchema = {};

    // Call each constraint
    var constraint
    _.each(constraints, function(element, index, list) {        
        constraint = this.getConstraintOrThrowError(element[0]);
        // Put the constraints result into a result object
        resultSchema[element[0]] = constraint(value, element[1]);
    }, this);

    return resultSchema;
};

module.exports = ObjectValidator;