export function getOptionValue(options, name) {
  if (!options || !name) return null;
  return options?.find((option) => option.name === name)?.value;
}
