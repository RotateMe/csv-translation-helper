# csv-translation-helper README

## Overview

The use-case for this extension is a project where you have translatable strings, which appear in the code files of your workspace exactly `"!LIKE_THIS"` (*with* the parenthesis). It searches for such strings across all files and adds untranslated ones to a CSV file containing the translation. Moreover, it provides hover-info on translated strings in such CSV files, namely in which files and lines the translated string is used. 

# Usage

This extension adds the command the command "Scan and add missing translatable strings" to the command palette, which should be run, when the translation file is open in the editor. The translation file  is assumed to be a .csv file, listing all translatable strings and their translations: 

```
!LIKE_THIS,"like this","wie hier"
```

Running this command with an active file opened in the editor will search for all translatable strings in files in your workspace (except for those in the current file) and will add all translatable strings which are not yet listed in the current file to the end of the file.

After having run this command, you will get hover-info when hovering over a line in a CSV file, namely all occurrences of the translated string in your code files.