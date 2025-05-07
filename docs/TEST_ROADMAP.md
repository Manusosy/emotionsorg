# Test Roadmap for Emotions App

This document tracks known issues, production readiness concerns, and future testing requirements for the Emotions App.

## Recently Fixed Issues

### UI Related Fixes
- Fixed the InfoCircled icon error by replacing with correct Info icon from lucide-react
- Added more African languages from Nigeria, Ghana, Sierra Leone, Rwanda, and Kenya
- Made consultation fee field readonly and fixed at zero
- Fixed profile saving error with better error handling and API response mapping

## Known TypeScript Issues

### User Metadata Type Issues

- **Issue**: TypeScript errors related to user metadata in profile components.
  - `Property 'user_metadata' does not exist on type 'User'`
  - `Property 'education' does not exist on type 'MoodMentor'`
  - `Property 'languages' does not exist on type 'MoodMentor'`
  - `Property 'therapyTypes' does not exist on type 'MoodMentor'`
  - `Property 'avatar_url' does not exist on type 'MoodMentor'`
  
- **Root Cause**: Missing or incomplete TypeScript type definitions for user data structures and metadata.

- **Production Fix Required**: 
  - Create proper TypeScript interfaces for User metadata
  - Update the User interface to include user_metadata field
  - Ensure MoodMentor interface includes all required fields (education, languages, therapyTypes, etc.)
  - Consider creating a UserData context with proper TypeScript typing

### React Namespace Issues

- **Issue**: TypeScript errors related to React namespace not being found
  - `Cannot find namespace 'React'`
  - `Cannot find module 'react' or its corresponding type declarations`
  - `Cannot find module 'react-router-dom' or its corresponding type declarations`
  
- **Production Fix Required**:
  - Update tsconfig.json to properly include React types
  - Ensure all dependencies have proper @types packages installed

## Dependencies and Build Issues

### Package Management Issues

- **Issue**: Dependency conflicts with node_modules (rollup, esbuild)
  - `Cannot find module @rollup/rollup-win32-x64-msvc`
  - Permission issues when deleting node_modules

- **Production Fix Required**:
  - Implement CI/CD pipeline with clean environment
  - Specify exact versions for dependencies in package.json
  - Consider using package-lock.json or yarn.lock for deterministic builds
  - Document specific Node.js version requirements

### Icon Library Issues

- **Issue**: Incorrect icon imports (InfoCircled) from lucide-react
  - Import of non-existent icons causing runtime errors

- **Production Fix Required**:
  - Create a consistent icon usage guideline/document
  - Consider creating an icon index file to centralize all icon imports
  - Add validation tests for icon imports

## UI/UX Testing Requirements

### Form Validation

- **Issue**: Complex form validation with many fields needs thorough testing
  - Required fields may not be properly validated across different components
  - Conditional validation logic needs testing
  
- **Production Testing Required**:
  - Create end-to-end tests for form submission workflows
  - Test field validation behavior across different browsers
  - Create form validation unit tests for complex validation logic

### Profile Data Persistence

- **Issue**: Pre-filled fields and data persistence need careful testing
  - User data should persist correctly between sessions and page refreshes
  - Pre-filled data should not be overwritten unexpectedly
  
- **Production Testing Required**:
  - Create tests for data loading and persistence
  - Test edge cases with partial profile data
  - Verify pre-filled field behavior with various user account states

## Accessibility Testing

- **Issue**: Need to verify accessibility of all form components
  - Screen reader compatibility
  - Keyboard navigation
  - Color contrast for validation messages
  
- **Production Testing Required**:
  - Run accessibility audit tools (Lighthouse, axe)
  - Conduct screen reader tests
  - Verify keyboard navigation paths

## Performance Checks

- **Issue**: Profile pages with many form fields may cause performance issues
  - Multiple state updates could cause unnecessary renders

- **Production Testing Required**:
  - Run performance profiling in development and production builds
  - Measure and optimize render cycles
  - Test on lower-end devices

## Security Considerations

- **Issue**: Form submissions with user data need security review
  - Data sanitization for inputs
  - Authorization for profile updates
  
- **Production Fix Required**:
  - Implement input sanitization for all user-generated content
  - Review authorization flows for profile edits
  - Add rate limiting for form submissions

## Follow-up Items

1. Create proper TypeScript interfaces for all data structures
2. Implement unit tests for form validation logic
3. Document setup requirements for development environment
4. Create E2E tests for critical user flows
5. Perform accessibility audit and fixes 