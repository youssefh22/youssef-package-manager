Steps taken to build this project:

1. Initialize the Project
   - mkdir youssef-package-manager
   - cd youssef-package-manager
   - npm init -y
2. Install Dependencies
   - npm install axios tar
3. Create the Script
   - index.js
4. Make the Script Executable
   - Updated 'package.json' to include a 'bin' field and make the script executable
5. Make the script executable
   - chmod +x index.js
6. Link the package globally
   - sudo npm link
    
Example usage:

1. Add command
   - ypm add is-thirteen@1.0.0
2. Install command
   - ypm install
3. Delete command
   - ypm delete is-thirteen
