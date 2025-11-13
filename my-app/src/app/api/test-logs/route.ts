import { NextResponse } from 'next/server';
import logger from '../../../lib/logger';

export async function GET() {
  console.log('🔍 Test logs endpoint called');
  
  logger.info('Test log - INFO level');
  logger.warn('Test log - WARN level');  
  logger.error('Test log - ERROR level');
  logger.debug('Test log - DEBUG level');

  // Test with metadata
  logger.info('Test log with metadata', { 
    endpoint: '/api/test-logs',
    timestamp: new Date().toISOString(),
    testData: { foo: 'bar', count: 42 }
  });

  console.log('✅ Test logs sent');

  return NextResponse.json({ 
    message: 'Test logs sent successfully',
    timestamp: new Date().toISOString()
  });
}