export function getOptionValue(options, name) {
  return options?.find((option) => option.name === name)?.value;
}
