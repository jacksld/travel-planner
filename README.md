# GENERATIVE AI TRAVEL PLANNER

## Overview

The Generative AI Travel Planner is a serverless web application designed to help travelers, travel agencies, and tourism professionals create and manage personalized travel itineraries efficiently. By inputting destination, trip duration, and interests, authenticated users receive AI-generated day-by-day plans with activities, timing, and descriptions tailored to their preferences. The platform enables users to save, update, rename, and organize their itineraries with smart duplicate detection, enhancing user experiences in real-world applications, with potential applications in tourism businesses, travel startups, and personal trip planning.

## Solution Architecture

The platform employs a serverless AWS architecture to deliver an AI-powered travel itinerary generation and management system. User requests flow through AWS Amplify’s hosted web interface, where inputs are processed via a GraphQL API managed by AWS AppSync. Backend logic is handled by AppSync JavaScript resolvers, which interact with Amazon Bedrock to generate personalized itineraries using Claude 3 Haiku, with itinerary data stored in DynamoDB. User authentication and access control are managed through Amplify Auth with Amazon Cognito integration.

![Project architecture](/project-architecture.png)

## How to use this project

Visit this [URL](https://main.d5p29e51dizo8.amplifyapp.com)

 
