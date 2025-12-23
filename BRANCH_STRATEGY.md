# 🌿 Git Branch Strategy & Protection Rules

## Tổng Quan

```
main (development) ────PR────> production (protected) ───auto-deploy──> Render + Vercel
```

---

## 🚀 BƯỚC 1: Tạo Nhánh Production

```bash
# Đảm bảo đang ở main và code đã commit
git checkout main
git pull origin main

# Tạo nhánh production từ main
git checkout -b production

# Push lên GitHub
git push -u origin production
```

Verify: Vào GitHub repo → Tab **Branches** → Thấy nhánh `production` ✅

---

## 🔒 BƯỚC 2: Tạo Branch Protection Rules (Chi Tiết)

### 2.1 Vào Settings
1. Vào GitHub repository: `https://github.com/username/repo`
2. Click **Settings** (tab trên cùng, bên phải)
3. Sidebar bên trái → Click **Branches**
4. Phần **Branch protection rules** → Click **Add rule** hoặc **Add branch protection rule**

### 2.2 Cấu Hình Protection Rule

#### A. Branch name pattern
```
production
```
Hoặc dùng wildcard: `prod*` (nếu có nhiều nhánh production-like)

#### B. Protect matching branches - Các options khuyến nghị:

##### 🔹 **Require a pull request before merging** (BẮT BUỘC)
```
☑️ Require a pull request before merging
   ├─ ☑️ Require approvals: 1
   │     └─ Số người approve tối thiểu (1 nếu solo, 2+ nếu team)
   │
   ├─ ☐ Dismiss stale pull request approvals when new commits are pushed
   │     └─ Bỏ tick nếu solo project
   │
   ├─ ☐ Require review from Code Owners
   │     └─ Bỏ tick nếu không có CODEOWNERS file
   │
   └─ ☐ Restrict who can dismiss pull request reviews
         └─ Bỏ tick nếu solo
```

##### 🔹 **Require status checks to pass before merging** (TÙY CHỌN)
```
☐ Require status checks to pass before merging
   └─ Chỉ tick nếu có CI/CD (GitHub Actions, CircleCI, etc.)
   └─ Nếu tick, chọn các checks bắt buộc phải pass
```

##### 🔹 **Require conversation resolution before merging** (KHUYẾN NGHỊ)
```
☑️ Require conversation resolution before merging
   └─ Đảm bảo mọi comment trong PR được resolve
```

##### 🔹 **Require signed commits** (TÙY CHỌN)
```
☐ Require signed commits
   └─ Bỏ tick nếu không setup GPG signing
```

##### 🔹 **Require linear history** (KHUYẾN NGHỊ)
```
☑️ Require linear history
   └─ Tránh merge commits, chỉ cho phép squash/rebase
```

##### 🔹 **Require deployments to succeed before merging** (TÙY CHỌN)
```
☐ Require deployments to succeed before merging
   └─ Bỏ tick (chỉ dùng nếu có staging environment)
```

##### 🔹 **Lock branch** (KHUYẾN NGHỊ cho Production)
```
☑️ Lock branch
   └─ Chỉ cho phép pull requests (không ai push trực tiếp)
   └─ Admin vẫn có thể bypass nếu cần emergency fix
```

##### 🔹 **Do not allow bypassing the above settings** (TÙY CHỌN)
```
☐ Do not allow bypassing the above settings
   └─ Tick = Admin KHÔNG thể bypass (rất strict)
   └─ Bỏ tick = Admin vẫn bypass được (khuyến nghị cho solo/small team)
```

#### C. Rules applied to everyone including administrators

```
☐ Allow force pushes
   ├─ Everyone: Không cho phép force push
   └─ Specify who can force push: Bỏ trống
   
☐ Allow deletions
   └─ Không cho phép xóa nhánh production
```

### 2.3 Save
- Kéo xuống dưới cùng
- Click **Create** (nếu tạo mới) hoặc **Save changes** (nếu edit)

✅ **Done!** Nhánh `production` đã được protect!

---

## 🎯 BƯỚC 3: Config Auto-Deploy

### 3.1 Render Backend

1. Vào [Render Dashboard](https://dashboard.render.com)
2. Click service **social-media-backend**
3. **Settings** → **Build & Deploy**
4. **Branch**: `production` (đổi từ `main`)
5. **Auto-Deploy**: **Yes** ✅
6. **Save Changes**

### 3.2 Vercel Frontend

1. Vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Click vào project
3. **Settings** → **Git**
4. **Production Branch**: `production` (đổi từ `main`)
5. **Save**

Optional - Config Preview Branches:
```
☑️ All branches (preview deployments cho mọi branch)
```

---

## 🔄 WORKFLOW: Deploy Lên Production

### Option 1: Pull Request (KHUYẾN NGHỊ - An toàn)

```bash
# 1. Code trên main
git checkout main
# ... code code code ...
git add .
git commit -m "feat: add new feature"
git push origin main

# 2. Tạo Pull Request trên GitHub
#    Vào GitHub → Pull requests → New pull request
#    base: production ← compare: main
#    
#    Điền title: "Deploy v1.2.0"
#    Điền description: changelog
#    Create pull request

# 3. Review (nếu có teammate) → Merge pull request

# 4. Render & Vercel TỰ ĐỘNG deploy! 🎉
```

### Option 2: Merge Local (Nhanh - Cho solo dev)

```bash
# Nếu bạn là owner và đã disable "Lock branch"
git checkout production
git merge main
git push origin production

# Auto-deploy triggered!
```

### Option 3: Cherry-pick (Deploy commit cụ thể)

```bash
# Chỉ deploy 1 hoặc vài commits
git checkout production
git cherry-pick abc123  # commit hash từ main
git push origin production
```

---

## 📋 Protection Rules - Config Khuyến Nghị

### Solo Developer (1 người)
```
☑️ Require a pull request before merging
   └─ Require approvals: 0 hoặc 1 (tự approve)
☑️ Require conversation resolution before merging
☑️ Require linear history
☑️ Lock branch
☐ Do not allow bypassing (để admin bypass được)
```

### Small Team (2-5 người)
```
☑️ Require a pull request before merging
   └─ Require approvals: 1-2
   └─ Dismiss stale pull request approvals: ☑️
☑️ Require status checks (nếu có CI/CD)
☑️ Require conversation resolution before merging
☑️ Require linear history
☑️ Lock branch
☐ Do not allow bypassing
```

### Large Team/Enterprise
```
☑️ Require a pull request before merging
   └─ Require approvals: 2-3
   └─ Dismiss stale pull request approvals: ☑️
   └─ Require review from Code Owners: ☑️
☑️ Require status checks to pass
☑️ Require signed commits
☑️ Require conversation resolution
☑️ Require linear history
☑️ Lock branch
☑️ Do not allow bypassing
```

---

## 🚨 Emergency: Bypass Protection (Admin only)

### Nếu cần hotfix KHẨN CẤP:

#### Option 1: Temporary Disable Rule
1. GitHub → Settings → Branches
2. Click **Edit** rule `production`
3. Bỏ tick **Lock branch** tạm thời
4. Push hotfix
5. Bật lại **Lock branch**

#### Option 2: Admin Override (nếu có quyền)
```bash
git checkout production
git cherry-pick <hotfix-commit>
git push origin production --force-with-lease
```

#### Option 3: Emergency PR
```bash
# Tạo PR trực tiếp từ hotfix branch
git checkout -b hotfix/critical-bug
# fix bug
git push origin hotfix/critical-bug
# Tạo PR: hotfix/critical-bug → production
# Merge ASAP
```

---

## 📊 Best Practices

### ✅ DO:
- Luôn test kỹ trên `main` trước
- Dùng PR để track changes
- Tag releases: `git tag v1.0.0 && git push --tags`
- Viết changelog trong PR description
- Review code cẩn thận trước merge

### ❌ DON'T:
- Push trực tiếp lên `production`
- Force push (trừ emergency)
- Merge mà không test
- Skip CI/CD checks
- Commit secrets/env files

---

## 🔍 Verify Protection Works

### Test Protection Rule:
```bash
# Thử push trực tiếp (sẽ bị từ chối)
git checkout production
echo "test" >> test.txt
git add test.txt
git commit -m "test"
git push origin production

# Expected error:
# remote: error: GH006: Protected branch update failed
# ✅ Rule hoạt động!
```

### Test Auto-Deploy:
```bash
# Tạo PR merge main → production
# Sau khi merge, check:
# - Render Dashboard → Logs (thấy deploy mới)
# - Vercel Dashboard → Deployments (thấy deployment mới)
```

---

## 🎯 Summary

| Step | Action | Status |
|------|--------|--------|
| 1 | Tạo nhánh `production` | ⬜ |
| 2 | Push lên GitHub | ⬜ |
| 3 | Settings → Branches → Add rule | ⬜ |
| 4 | Config protection rules | ⬜ |
| 5 | Save rule | ⬜ |
| 6 | Config Render branch = production | ⬜ |
| 7 | Config Vercel branch = production | ⬜ |
| 8 | Test tạo PR main → production | ⬜ |
| 9 | Verify auto-deploy | ⬜ |

Checklist xong = Production branch sẵn sàng! 🚀
