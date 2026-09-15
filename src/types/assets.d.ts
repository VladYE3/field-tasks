declare module '*.html' {
  // Metro resolves bundled asset imports to an opaque module reference.
  const value: any;
  export default value;
}
