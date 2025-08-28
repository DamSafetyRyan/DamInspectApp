# DamInspect Code Organization Guide

## Overview

This guide defines the code organization for DamInspect, a mobile application for water infrastructure inspections. The architecture follows Domain-Driven Design (DDD) principles with Hexagonal Architecture (Ports & Adapters) to ensure clear separation of concerns, testability, and maintainability.

## Architecture Principles

1. **Hexagonal Architecture**: Business logic at the center, infrastructure at the edges
2. **Domain-Driven Design**: Rich domain models reflecting real inspection workflows
3. **Test-Driven Development**: Tests drive the design and implementation
4. **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
5. **Clean Code**: Self-documenting, minimal complexity, maximum clarity
