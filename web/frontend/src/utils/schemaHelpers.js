export function extractStepSchema(schema, step) {
  if (!schema || !schema.properties || !schema.$defs) return null;
  const stepDef = schema.properties[step]?.$ref;
  if (!stepDef) return null;
  const defName = stepDef.split('/').pop();
  const stepSchema = {
    ...schema.$defs[defName],
    definitions: schema.$defs,
  };

  function patchRefs(obj) {
    if (typeof obj !== 'object' || obj === null) return;
    for (const key in obj) {
      if (key === '$ref' && typeof obj[key] === 'string' && obj[key].startsWith('#/$defs/')) {
        obj[key] = obj[key].replace('#/$defs/', '#/definitions/');
      } else {
        patchRefs(obj[key]);
      }
    }
  }
  patchRefs(stepSchema);
  return stepSchema;
}
