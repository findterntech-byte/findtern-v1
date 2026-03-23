# Design Guidelines: Findtern Sign-Up Page

## Design Approach
**Reference-Based Approach**: Drawing inspiration from Findtern's clean, professional authentication interface with modern SaaS aesthetics similar to Linear, Notion, and modern fintech applications.

## Core Design Principles
- **Clarity First**: Minimize visual noise, focus attention on form completion
- **Trust Building**: Professional appearance with clear privacy indicators
- **Guided Flow**: Progressive disclosure with helpful microcopy and validation

---

## Typography System

**Font Family**: 
- Primary: Inter or DM Sans (Google Fonts)
- Fallback: -apple-system, BlinkMacSystemFont, system-ui

**Hierarchy**:
- Page Heading: text-2xl md:text-3xl, font-semibold
- Section Labels: text-sm font-medium
- Input Text: text-base font-normal
- Helper Text: text-xs md:text-sm
- Links: text-sm font-medium with underline on hover

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 3, 4, 6, 8
- Form field spacing: gap-4 or gap-6
- Section padding: p-6 md:p-8
- Input padding: px-4 py-3

**Structure**:
- Centered authentication card: max-w-md mx-auto
- Full viewport height with vertical centering (min-h-screen flex items-center)
- Card container: Subtle border, rounded-xl, with light shadow
- Responsive: Single column layout, mobile-first

---

## Component Library

### Authentication Card
- White/light background card with rounded-xl corners
- Subtle border (1px) and soft shadow (shadow-sm)
- Logo centered at top with mb-6
- Content padding: p-6 md:p-8

### Form Inputs
- Consistent height: h-12
- Border: 1px solid with rounded-lg
- Focus state: Ring effect with brand color (ring-2)
- Placeholder: Subtle gray (placeholder:text-gray-400)
- Full width inputs with clear labels above
- Required field indicator: Red asterisk (*) next to label

### Phone Number Field
- Split layout: Country selector (w-24) + Phone input (flex-1)
- Country code dropdown with flag icons (use react-phone-input-2 or similar)
- Default: India (+91)

### Password Field
- Toggle visibility icon positioned absolute right-3
- Eye/eye-slash icon using Heroicons
- Icon button: text-gray-500 hover:text-gray-700

### Button Components
**Primary Button** (Sign Up):
- Full width, h-12
- Brand teal/green background (#10B981 or similar)
- White text, font-medium
- Rounded-lg
- Hover: Slightly darker shade
- Loading state: Spinner icon

**Social Button** (Google):
- Full width, h-12
- White background with border
- Google logo + "Sign up with Google" text
- Hover: Subtle background change (bg-gray-50)

### Checkbox Component
- Custom styled checkbox (checked state shows brand color)
- Inline with terms text
- Link within text for "Terms & Conditions"

### Links
- Brand color (teal/green)
- Hover: Underline
- "Login" and "Terms & Conditions" links

---

## Form Validation

**Real-time Feedback**:
- Error messages appear below inputs (text-xs text-red-600)
- Input border turns red on error
- Success indicators: Green checkmark icon (optional)
- Display errors after field blur or form submission

**Required Fields**: All fields marked with asterisk (*)

---

## Content Structure

**Top Section**:
- Findtern logo (h-8 or h-10)
- Heading: "Sign up to find work you love"
- Subheading (optional): Brief value proposition

**Form Section**:
1. First Name + Last Name (grid grid-cols-2 gap-4)
2. Email
3. Phone Number (with country code)
4. Password (with toggle)
5. Terms & Conditions checkbox
6. Sign Up button
7. Divider with "OR"
8. Google Sign-in button

**Bottom Section**:
- "Already have an account? Login" centered with gap-1

---

## Spacing & Rhythm
- Between form fields: space-y-4
- Between sections: space-y-6
- Logo to heading: mb-2
- Heading to form: mb-8
- Button to alternative action: mt-6

---

## Interaction States

**Input Focus**: 
- Ring effect with brand color
- Border color intensifies

**Button Hover**:
- Primary: Darken by 5-10%
- Secondary: Light background overlay

**Disabled States**:
- Reduced opacity (opacity-50)
- Cursor not-allowed

---

## Images
No hero image required for this authentication page. Only include:
- Findtern logo (vector/SVG preferred, h-8 to h-10)
- Google logo icon for social sign-in button
- Eye/eye-slash icons for password toggle (Heroicons)

---

## Responsive Behavior

**Mobile** (< 768px):
- Card takes full width with mx-4
- Reduced padding (p-6)
- Smaller logo (h-8)

**Desktop** (≥ 768px):
- Fixed-width card (max-w-md)
- Increased padding (p-8)
- Centered on viewport

---

## Accessibility
- Proper label associations (htmlFor)
- ARIA labels for icon-only buttons
- Keyboard navigation support
- Focus visible indicators
- Screen reader friendly error messages