# Cross-Language Search Maintenance Guide

This document explains how to maintain cross-language search functionality, allowing users to find products regardless of the site's current language.

## How It Works

Shopify's native search is locale-aware and only searches product content in the current language. To enable cross-language search, we use **product tags** which are NOT locale-specific and persist across all languages.

The predictive search has been modified to include `tag` in its searchable fields.

---

## Tag Naming Convention

Use a consistent prefix format for easy identification:

```
search:{language_code}:{search_term}
```

### Examples

| Product | Tags to Add |
|---------|-------------|
| "Nails of the Day" gel polish | `search:en:nails of the day`, `search:en:notd`, `search:ru:ногти дня`, `search:ru:маникюр дня` |
| "Summer Vibes" collection | `search:en:summer vibes`, `search:en:summer nails`, `search:ru:летний маникюр`, `search:ru:летнее настроение` |
| "French Tips" kit | `search:en:french tips`, `search:en:french manicure`, `search:ru:французский маникюр`, `search:ru:френч` |
| "Gel Polish" base product | `search:en:gel polish`, `search:ru:гель лак`, `search:ru:гель-лак`, `search:en:shellac` |
| "Base Coat" product | `search:en:base coat`, `search:ru:база`, `search:ru:базовое покрытие` |
| "Top Coat" product | `search:en:top coat`, `search:ru:топ`, `search:ru:финишное покрытие` |

---

## How to Add Tags Manually

1. Go to **Shopify Admin > Products**
2. Select the product(s) you want to edit
3. Click **More actions > Add tags**
4. Enter tags separated by commas
5. Click **Save**

### Bulk Editing
1. Go to **Products > All products**
2. Check multiple products
3. Click **Bulk edit**
4. Add the "Tags" column if not visible
5. Enter tags for each product

---

## Shopify Flow Automation

Automate tag generation for new products using Shopify Flow.

### Basic Flow Setup

**Flow Name:** Auto-Add Cross-Language Search Tags

**Trigger:** Product created

**Conditions & Actions:**

#### Condition 1: Product title contains "nails of the day"
**Action:** Add tags:
- `search:en:nails of the day`
- `search:en:notd`
- `search:ru:ногти дня`

#### Condition 2: Product title contains "gel polish"
**Action:** Add tags:
- `search:en:gel polish`
- `search:ru:гель лак`
- `search:ru:гель-лак`

#### Condition 3: Product title contains "nail art"
**Action:** Add tags:
- `search:en:nail art`
- `search:ru:нейл арт`
- `search:ru:дизайн ногтей`

#### Condition 4: Product title contains "french"
**Action:** Add tags:
- `search:en:french manicure`
- `search:en:french tips`
- `search:ru:французский маникюр`
- `search:ru:френч`

#### Condition 5: Product title contains "base coat"
**Action:** Add tags:
- `search:en:base coat`
- `search:ru:база`
- `search:ru:базовое покрытие`

#### Condition 6: Product title contains "top coat"
**Action:** Add tags:
- `search:en:top coat`
- `search:ru:топ`
- `search:ru:финишное покрытие`

### Step-by-Step Flow Creation

1. **Install Shopify Flow**
   - Free for Shopify Plus
   - Available via App Store for other plans

2. **Create New Flow**
   - Go to **Shopify Admin > Apps > Flow**
   - Click **Create workflow**

3. **Set Trigger**
   - Select **Product created**

4. **Add Condition**
   - Click **+** and select **Condition**
   - Set: `Product > Title` → `contains` → your keyword

5. **Add Action**
   - Click **+** and select **Action**
   - Choose **Add product tags**
   - Enter your tags separated by commas

6. **Repeat for Each Keyword Pattern**

7. **Activate the Flow**

---

## Search & Discovery Synonyms

Complement tags with synonyms for common search terms.

### Setup

1. Install [Search & Discovery](https://apps.shopify.com/search-and-discovery) app (free)
2. Go to **Apps > Search & Discovery > Search**
3. Click **Synonyms** tab
4. Click **Add synonym group**

### Recommended Synonym Groups

| Group | Terms |
|-------|-------|
| 1 | nails of the day, ногти дня, NOTD, notd |
| 2 | gel polish, гель лак, гель-лак, shellac |
| 3 | nail art, нейл арт, дизайн ногтей |
| 4 | french manicure, французский маникюр, френч, french tips |
| 5 | base coat, база, базовое покрытие |
| 6 | top coat, топ, финишное покрытие, финиш |
| 7 | cuticle oil, масло для кутикулы, кутикульное масло |
| 8 | nail lamp, лампа для ногтей, UV лампа, LED лампа |
| 9 | manicure, маникюр |
| 10 | pedicure, педикюр |

---

## Common Translation Dictionary

Use this dictionary when adding search tags:

| English | Russian |
|---------|---------|
| nails of the day | ногти дня, маникюр дня |
| gel polish | гель лак, гель-лак |
| nail art | нейл арт, дизайн ногтей |
| french manicure | французский маникюр, френч |
| base coat | база, базовое покрытие |
| top coat | топ, финишное покрытие |
| cuticle oil | масло для кутикулы |
| nail lamp | лампа для ногтей |
| UV lamp | УФ лампа, ультрафиолетовая лампа |
| LED lamp | LED лампа, светодиодная лампа |
| nail file | пилка для ногтей |
| buffer | баф, полировщик |
| primer | праймер |
| dehydrator | дегидратор |
| remover | средство для снятия |
| acetone | ацетон |
| glitter | глиттер, блестки |
| chrome | хром |
| matte | матовый |
| glossy | глянцевый |

---

## Maintenance Checklist

### When Adding New Products
- [ ] Add English search tags (`search:en:...`)
- [ ] Add Russian search tags (`search:ru:...`)
- [ ] Include common abbreviations (NOTD, etc.)
- [ ] Include alternate spellings (гель лак, гель-лак)

### Monthly Review
- [ ] Check Search & Discovery analytics for failed searches
- [ ] Add synonyms for common failed searches
- [ ] Review new products for missing tags
- [ ] Update translation dictionary with new terms

### Quarterly Review
- [ ] Review Shopify Flow automations
- [ ] Add new keyword patterns as product catalog grows
- [ ] Test cross-language search functionality

---

## Troubleshooting

### Search Not Finding Tagged Products
1. Verify tags are saved correctly (check product in Admin)
2. Clear browser cache and test again
3. Wait 5-10 minutes for Shopify to index new tags

### Synonyms Not Working
1. Verify Search & Discovery app is installed and active
2. Check synonym group is saved correctly
3. Test in incognito/private browser window

### Flow Not Adding Tags
1. Verify Flow is active (not paused)
2. Check condition matches product title exactly
3. Review Flow run history for errors

---

## Technical Reference

### Modified File
**File:** `assets/predictive-search.js`

**Change:** Line 179 - Added `tag` to searchable fields:
```javascript
fetch(`${routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&resources[type]=product,collection,page,article,query&resources[options][fields]=title,product_type,variants.title,vendor,tag&section_id=predictive-search`, {
```

### Searchable Fields
The predictive search now searches these fields:
- `title` - Product title
- `product_type` - Product type/category
- `variants.title` - Variant names
- `vendor` - Product vendor
- `tag` - Product tags (enables cross-language search)
