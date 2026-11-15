# copy-sync decision graph

The decisions one sync makes, as a caller can observe them. The branch from `bridge` is taken once for each skills
bridge path, and the branch from `side` once for each file that differs between a copy bridge and the canonical
skills directory.

```mermaid
flowchart TD
  request{Is the request valid?}
  request -->|E1 no: an unsupported output form, a resolution with no recognized side, for a file not left for the user, or that would leave the copies holding different versions| rejected([Request rejected, nothing written])
  request -->|E2 yes| canon{Does the canonical skills directory exist?}
  canon -->|E3 no, and a copy bridge exists| missing([Sync fails: the canonical skills directory is missing, nothing written])
  canon -->|E4 no, and no skills bridge is a copy| result
  canon -->|E5 yes| bridge{What is at the skills bridge path?}
  bridge -->|E6 a link, a regular file, or nothing| untouched[Nothing written for that bridge]
  bridge -->|E7 a copy| same{Does the copy hold the same files with the same content?}
  same -->|E8 yes| kept[Copy kept as it is]
  same -->|E9 no| side{For each differing file, which side changed since the last agreement?}
  side -->|E10 one side only, and no other copy bridge changed it differently or has it left for the user| onesided[That side's version written to the other side]
  side -->|E11 both sides, no last agreement can be found, or two copy bridges changed it differently| resolved{Does a resolution name the file?}
  resolved -->|E12 yes| picked[The picked side's version written to the other side]
  resolved -->|E13 no| left[Nothing written for that file, which is left for the user]
  onesided -->|E14| tracked{Does git track the copy's path?}
  picked -->|E15| tracked
  left -->|E16| tracked
  kept -->|E17| tracked
  tracked -->|E18 yes| protected[Copy protection in place for the copy]
  tracked -->|E19 no, or no git repository| result
  protected -->|E20| result([Result reported])
  untouched -->|E21| result
  onesided -->|E22 a write fails| failed([Sync fails, failure reported])
  picked -->|E23 a write fails| failed
```

- Outcomes: `rejected`, `missing`, `failed`, and `result`.
