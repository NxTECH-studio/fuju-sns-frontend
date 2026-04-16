/**
 * Validators Utility Tests
 */

import { describe, it, expect } from 'vitest';
import { Validators } from '../validators';

describe('Validators', () => {
  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const result = Validators.validateEmail('test@example.com');
      expect(result).toBeNull();
    });

    it('should reject invalid email format', () => {
      const result = Validators.validateEmail('invalid-email');
      expect(result).toBeTruthy();
    });

    it('should reject empty email', () => {
      const result = Validators.validateEmail('');
      expect(result).toBeTruthy();
    });

    it('should validate emails with different TLDs', () => {
      expect(Validators.validateEmail('test@example.co.jp')).toBeNull();
      expect(Validators.validateEmail('test@example.org')).toBeNull();
    });
  });

  describe('validateUsername', () => {
    it('should validate correct username', () => {
      const result = Validators.validateUsername('john_doe');
      expect(result).toBeNull();
    });

    it('should reject username with spaces', () => {
      const result = Validators.validateUsername('john doe');
      expect(result).toBeTruthy();
    });

    it('should reject empty username', () => {
      const result = Validators.validateUsername('');
      expect(result).toBeTruthy();
    });

    it('should validate username with numbers', () => {
      const result = Validators.validateUsername('user123');
      expect(result).toBeNull();
    });
  });

  describe('validatePostContent', () => {
    it('should validate post content', () => {
      const result = Validators.validatePostContent('This is a valid post');
      expect(result).toBeNull();
    });

    it('should reject empty post', () => {
      const result = Validators.validatePostContent('');
      expect(result).toBeTruthy();
    });

    it('should accept post with 5000 characters', () => {
      const longPost = 'a'.repeat(5000);
      const result = Validators.validatePostContent(longPost);
      expect(result).toBeNull();
    });

    it('should reject post with more than 5000 characters', () => {
      const tooLongPost = 'a'.repeat(5001);
      const result = Validators.validatePostContent(tooLongPost);
      expect(result).toBeTruthy();
    });

    it('should trim whitespace before validation', () => {
      const result = Validators.validatePostContent('   test content   ');
      expect(result).toBeNull();
    });
  });

  describe('validateCommentContent', () => {
    it('should validate comment content', () => {
      const result = Validators.validateCommentContent('Nice post!');
      expect(result).toBeNull();
    });

    it('should reject empty comment', () => {
      const result = Validators.validateCommentContent('');
      expect(result).toBeTruthy();
    });

    it('should accept comment with 1000 characters', () => {
      const longComment = 'a'.repeat(1000);
      const result = Validators.validateCommentContent(longComment);
      expect(result).toBeNull();
    });

    it('should reject comment with more than 1000 characters', () => {
      const tooLongComment = 'a'.repeat(1001);
      const result = Validators.validateCommentContent(tooLongComment);
      expect(result).toBeTruthy();
    });
  });

  describe('validateDisplayName', () => {
    it('should validate display name', () => {
      const result = Validators.validateDisplayName('John Doe');
      expect(result).toBeNull();
    });

    it('should reject empty display name', () => {
      const result = Validators.validateDisplayName('');
      expect(result).toBeTruthy();
    });

    it('should validate display name with japanese characters', () => {
      const result = Validators.validateDisplayName('太郎');
      expect(result).toBeNull();
    });

    it('should accept display names up to 50 characters', () => {
      const longName = 'a'.repeat(50);
      const result = Validators.validateDisplayName(longName);
      expect(result).toBeNull();
    });
  });

  describe('validateBio', () => {
    it('should validate bio text', () => {
      const result = Validators.validateBio('This is my bio');
      expect(result).toBeNull();
    });

    it('should allow empty bio', () => {
      const result = Validators.validateBio('');
      expect(result).toBeNull();
    });

    it('should accept bio up to 160 characters', () => {
      const longBio = 'a'.repeat(160);
      const result = Validators.validateBio(longBio);
      expect(result).toBeNull();
    });

    it('should reject bio longer than 160 characters', () => {
      const tooLongBio = 'a'.repeat(161);
      const result = Validators.validateBio(tooLongBio);
      expect(result).toBeTruthy();
    });
  });

  describe('validatePostImages', () => {
    it('should validate empty image array', () => {
      const result = Validators.validatePostImages([]);
      expect(result).toBeNull();
    });

    it('should accept up to 10 image URLs', () => {
      const images = Array.from({ length: 10 }, (_, i) => `https://example.com/image${i}.jpg`);
      const result = Validators.validatePostImages(images);
      expect(result).toBeNull();
    });

    it('should reject more than 10 images', () => {
      const images = Array.from({ length: 11 }, (_, i) => `https://example.com/image${i}.jpg`);
      const result = Validators.validatePostImages(images);
      expect(result).toBeTruthy();
    });

    it('should validate image URL format', () => {
      const result = Validators.validatePostImages([
        'https://example.com/image.jpg',
        'https://example.com/image.png',
      ]);
      expect(result).toBeNull();
    });
  });
});
