# Contributing to MaquiControl Platform

This document lists the conventions this codebase follows.

## Domain-Driven Design (DDD) Principles

- **Bounded Contexts**: keep domain logic within its own context: `iam`, `profiles`, `fleet`, `rental`, `maintenance`, `operations`, `subscription`, `billing`, and the `shared` kernel.
- **Aggregate Roots**: every aggregate enforces its own invariants and extends `AbstractDomainAggregateRoot`.
- **Value Objects**: use an immutable, self-validating type for any domain primitive with a validation rule.
- **Hexagonal persistence**: the domain model never imports `jakarta.persistence`. Each aggregate has a parallel `*PersistenceEntity`, `*PersistenceAssembler`, and `*RepositoryImpl` adapter.
- **CQRS**: commands (`application.commandservices`) and queries (`application.queryservices`) are separate contracts. Command names match the Event Storming and the report's command catalog.
- **Railway-Oriented error handling**: a command handler returns `Result<T, ApplicationError>` for an expected failure, never an exception.
- **Domain events**: an aggregate registers events; the repository adapter calls `DomainEventPublisher.publishAndClearEvents`, which writes them to the transactional outbox. Event handlers must be idempotent.
- **Cross-context integration**: only through an ACL facade and published integration events, never a direct dependency on another context's `domain` package.
- **Architecture Decision Records**: architectural changes are documented in `docs/adrs.md`.

## Technical Stack

- **Java 27**: records, sealed interfaces, pattern matching in `switch`.
- **Spring Boot 4.x**: constructor injection, REST controllers, Spring Data JPA, Spring Security.
- **MySQL**: the datastore behind every profile.
- **springdoc-openapi**: Swagger UI generated from the controllers.
- **Maven**: use the bundled wrapper, `./mvnw`.

## Commit Message Guidelines

Conventional Commits, format `<type>(<scope>): <description>.` (lowercase, period at the end).

- **feat**: a new feature
- **fix**: a bug fix
- **docs**: documentation changes
- **refactor**: a code change that neither fixes a bug nor adds a feature
- **test**: adding or correcting tests
- **build**: changes to the build system or dependencies
- **chore**: anything that doesn't touch `src` or `test`

Example: `feat(fleet): add register machinery command.`

## Versioning Policy

Semantic Versioning (SemVer).

## Git Flow Workflow

- **main**: production-ready; only stable releases merge here.
- **develop**: the integration branch; all work starts here.
- **feature/**: new features, branched off `develop`.
- **release/**: release preparation, branched off `develop`.

## Pull Request Process

1. Branch from `develop` with the `feature/` prefix.
2. Build the project and confirm it compiles and runs.
3. Follow the existing code style and naming.
4. Describe the change clearly in the PR.
5. Once approved, it merges into `develop`.
