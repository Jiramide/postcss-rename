## 0.8.0

* Added variable renaming capabilities. Users who are interested in using the
variable renaming plugin require `"moduleResolution"` to be `"node16"` or
higher in order for TypeScript to properly resolve types.

## 0.7.1

* Fix a bad release.

## 0.7.0

* Changed the plugin to run synchronously. This is a breaking change if you
expect this plugin to run asynchronously.

## 0.6.1

* Don't mangle `@keyframes` breakpoints with decimal points.
