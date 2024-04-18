# Schulatlas Scraper

Install [NodeJS +19](https://nodejs.org/en), make sure you can run it from a terminal, e.g. CMD.EXE, or Bash/ZSH on Linux/macOS.

Then run

```
node scraper.js
```

This will generate 3 files:

- `base.json`, the original JSON data containing basic information for all schools
- `schools.csv`, the basic information for all schools transformed to CSV. Fields:
  - `type`: the school type, e.g. `VS`, `AHS`, etc.
  - `skz`: a seemingly unique identifier
  - `desc`: the description
  - `coords`: longitude/latitude separated by a comma
  - `street`: street address
  - `zip`: ZIP code
  - `city`: town or city
  - `keeper`: whether this is a public or private school
  - `classes`: number of classes
  - `pupils`: total number of pupils
  - `male`: number of male pupils
  - `female`: number of female pupils
- `vs-left-to.csv`: Information about how many pupils from a primary school left for what other school. For each from -> to pair, there is one row with the following fields:
  - `type`: "VS"
  - `skz`: unique identifier for the "from" school
  - `desc`: the description of the "from" school
  - `coords`: longitude/latitude separated by a comma of the "from" school
  - `street`: street address of the "from" school
  - `zip`: ZIP code of the "from" school
  - `city`: town or city of the "from" school
  - `keeper`: whether the "from" school is a public or private school
  - `classes`: number of classes of the "from" school
  - `pupils`: total number of pupils of the "from" school
  - `male`: number of male pupils of the "from" school
  - `female`: number of female pupils of the "from" school
  - `lt_type`: type of the "to" school
  - `lt_skz`: unique identifier of the "to" school (`SKZ_LAUFEND` in the original data)
  - `lt_desc`: description of the "to" school (`BESCHREIBUNG` in the original data)
  - `lt_ipub_desc`: another description of the "to" school (`IPUB2_BESCHREIBUNG` in the original data)
  - `lt_street`: street address of the "tp" school
  - `lt_zip`: ZIP code of the "to" school
  - `lt_city`: town or city of the "to" school
