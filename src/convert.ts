import Swagger from './Swagger';
import Paths from './Paths';
import Property from './Property';
import Schema from './Schema';
import PathItem from './PathItem';
import Operation from './Operation';
import Definitions from './Definitions';
import Options from './Options';
import EntitySet from './EntitySet';
import EntityType from './EntityType';
import EntityProperty from './EntityProperty';
import Parameter from './Parameter';

const defaultResponse = {
  description: 'Unexpected error',
  schema: {
    $ref: '#/definitions/Error'
  }
}

function entitySetGet(entitySet: EntitySet): Operation {
  return {
    operationId: `get${entitySet.name}`,
    responses: {
      '200': {
        description: `List of ${entitySet.entityType.name}`,
        schema: {
          type: 'array',
          items: {
            $ref: `#/definitions/${entitySet.namespace}.${entitySet.entityType.name}`
          }
        }
      },
      default: defaultResponse
    }
  };
}

function entitySetPost(entitySet: EntitySet): Operation {
  return {
    operationId: `create${entitySet.name}`,
    parameters: [
      {
        name: entitySet.entityType.name,
        in: 'body',
        required: true,
        schema: {
          $ref: `#/definitions/${entitySet.namespace}.${entitySet.entityType.name}`
        }
      }
    ],
    responses: {
      '204': {
        description: 'Empty response.'
      },
      default: defaultResponse
    }
  }
}

function entitySetOperations(entitySet: EntitySet): PathItem {
  return {
    get: entitySetGet(entitySet),
    post: entitySetPost(entitySet)
  };
}

function entityTypeOperations(entitySet: EntitySet): PathItem {
  return {
    get: entityTypeGet(entitySet),
    delete: entityTypeDelete(entitySet),
    patch: entityTypePatch(entitySet)
  };
}

function entityTypeGet(entitySet: EntitySet): Operation {
  return {
    operationId: `get${entitySet.entityType.name}`,
    parameters: entitySet.entityType.key.map(property => {
      return {
        name: property.name,
        required: true,
        in: 'path'
      };
    }),
    responses: {
      '200': {
        description: `A ${entitySet.entityType.name}.`,
        schema: {
          $ref: `#/definitions/${entitySet.namespace}.${entitySet.entityType.name}`
        }
      },
      default: defaultResponse
    }
  };
}

function entityTypeDelete(entitySet: EntitySet): Operation {
  return {
    operationId: `delete${entitySet.entityType.name}`,
    parameters: entitySet.entityType.key.map(property => {
      return {
        name: property.name,
        required: true,
        in: 'path'
      };
    }),
    responses: {
      '204': {
        description: `Empty response.`,
      },
      default: defaultResponse
    }
  };
}
function entityTypePatch(entitySet: EntitySet): Operation {
  const parameters: Array<Parameter> = entitySet.entityType.key.map(property => {
    return {
      name: property.name,
      required: true,
      in: 'path'
    };
  });

  parameters.push({
    name: entitySet.entityType.name,
    in: 'body',
    required: true,
    schema: {
      $ref: `#/definitions/${entitySet.namespace}.${entitySet.entityType.name}`
    }
  });

  return {
    operationId: `update${entitySet.entityType.name}`,
    parameters,
    responses: {
      '204': {
        description: `Empty response.`,
      },
      default: defaultResponse
    }
  };
}
function paths(entitySets: Array<EntitySet>): Paths {
  const paths: Paths = {};

  entitySets.forEach(entitySet => {
    paths[`/${entitySet.name}`] = entitySetOperations(entitySet);

    if (entitySet.entityType.key) {
      const keys = entitySet.entityType.key.map(property => {
        switch (property.type) {
          case 'Edm.Int16':
          case 'Edm.Int32':
          case 'Edm.Int64':
          case 'Edm.Double':
            return `{${property.name}}`
        }

        return `'{${property.name}}'`
      });

      const path = `/${entitySet.name}(${keys.join(',')})`

      paths[path] = entityTypeOperations(entitySet)
    }
  });

  return paths;
}

function definitions(entitySets: Array<EntitySet>): Definitions {
  const definitions: Definitions = {
    'Error': {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: {
              type: 'string'
            },
            message: {
              type: 'string'
            }
          }
        }
      }
    }
  };

  entitySets.forEach(entitySet => {
    const type = `${entitySet.namespace}.${entitySet.entityType.name}`;

    definitions[type] = schema(entitySet.entityType);

  });

  return definitions;
}

function schema(entityType: EntityType): Schema {
  return {
    type: 'object',
    properties: properties(entityType.properties)
  };
}

function properties(properties: Array<EntityProperty>): {[name: string]: Property} {
  const result: {[name:string]: Property} = {};

  properties.forEach(({name, type}) => {
    result[name] = property(type);
  })

  return result;
}

function property(type: string): Property {
  const property: Property = {
    type: 'string'
  };

  switch (type) {
    case 'Edm.Int16':
    case 'Edm.Int32':
      property.type = 'integer';
      property.format = 'int32';
      break;
    case 'Edm.Int64':
      property.type = 'integer';
      property.format = 'int64';
      break;
    case 'Edm.Boolean':
      property.type = 'boolean';
      break;
    case 'Edm.Byte':
      property.format = 'byte';
      break;
    case 'Edm.Date':
      property.format = 'date';
      break;
    case 'Edm.DateTimeOffset':
      property.format = 'date-time';
      break;
    case 'Edm.Double':
      property.type = 'number';
      property.format = 'double';
      break;
    case 'Edm.Single':
      property.type = 'number';
      property.format = 'single';
      break;
  }

  return property;
}

function convert(entitySets, options: Options): Swagger {
  return {
    swagger: '2.0',
    host: options.host,
    produces: ['application/json'],
    basePath: options.basePath,
    info: {
      title: 'OData Service',
      version: '0.0.1'
    },
    paths: paths(entitySets),
    definitions: definitions(entitySets)
  };
}

export default convert;