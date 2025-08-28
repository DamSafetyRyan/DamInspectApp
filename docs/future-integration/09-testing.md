# 09 – Testing Strategy

## Backend
* Unit tests: Prisma validators, service layer (Jest)
* Integration: Spin up Testcontainer → run REST scenarios
* Contract: Pact tests between backend & iOS client models

## Web Front-End
* Component tests: React Testing Library + Jest
* E2E: Playwright – authenticate, create inspection, approve

## iOS
* XCTest for ViewModels
* UI Tests with XCUITest – offline form fill, photo capture stub
* Snapshot tests with iOSSnapshotTestCase

## Performance
* Locust load test: upload 100 inspections/min, measure P95 latency (<300 ms)

## Accessibility
* Web: axe-core automated check in CI
* iOS: Accessibility Inspector step in Xcode Cloud 