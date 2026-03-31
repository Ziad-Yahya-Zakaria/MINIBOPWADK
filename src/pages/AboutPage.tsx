import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import { Link as RouterLink } from 'react-router-dom';

export function AboutPage() {
  return (
    <Box
      className="public-screen"
      sx={{
        minHeight: '100dvh',
        py: { xs: 4, md: 6 }
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box
            sx={{
              borderRadius: { xs: 6, md: 8 },
              overflow: 'hidden',
              p: { xs: 3, md: 5 },
              color: '#fff',
              background:
                'linear-gradient(135deg, #0b5a46 0%, #0f7a5d 55%, #138065 100%)',
              boxShadow: '0 32px 70px rgba(11, 90, 70, 0.18)',
              position: 'relative'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                insetInlineEnd: -80,
                top: -60,
                width: 220,
                height: 220,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)'
              }}
            />
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              justifyContent="space-between"
              alignItems={{ md: 'flex-end' }}
            >
              <Stack spacing={1.5} sx={{ maxWidth: 760, position: 'relative', zIndex: 1 }}>
                <Typography
                  variant="overline"
                  sx={{ color: 'rgba(255,255,255,0.8)', letterSpacing: 1.2 }}
                >
                  Software Management System
                </Typography>
                <Typography variant="h3" sx={{ lineHeight: 1.2 }}>
                  منصة إدارة برمجية عالية التنظيم بطابع PWA حديث
                </Typography>
                <Typography sx={{ maxWidth: 620, color: 'rgba(255,255,255,0.86)' }}>
                  تم تصميم النظام ليوفر إدارة تشغيل، اعتماد، تقارير، وتبادل حزم
                  بيانات داخل تجربة استخدام عربية سريعة وواضحة، مع واجهة مناسبة
                  للتوسع والإدارة اليومية.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ zIndex: 1 }}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  startIcon={<RocketLaunchRoundedIcon />}
                  sx={{
                    bgcolor: '#fff',
                    color: '#0b5a46',
                    '&:hover': { bgcolor: '#f4f7f6' }
                  }}
                >
                  دخول النظام
                </Button>
                <Button
                  component={RouterLink}
                  to="/dashboard"
                  variant="outlined"
                  endIcon={<ArrowBackRoundedIcon />}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.42)',
                    color: '#fff'
                  }}
                >
                  اللوحة الرئيسية
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                className="public-card"
                sx={{
                  height: '100%',
                  borderRadius: 6,
                  bgcolor: 'background.paper'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Box className="about-icon-shell">
                      <InfoOutlinedIcon />
                    </Box>
                    <Typography variant="h5">About</Typography>
                    <Typography color="text.secondary">
                      النظام يركز على إدخال البيانات التشغيلية، دورة الاعتماد،
                      التصدير إلى PDF و XLSX، وإدارة الحزم المحلية مع تجربة
                      استخدام تشبه لوحات التحكم المؤسسية.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                className="public-card"
                sx={{
                  height: '100%',
                  borderRadius: 6,
                  bgcolor: 'background.paper'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Box className="about-icon-shell">
                      <Groups2OutlinedIcon />
                    </Box>
                    <Typography variant="h5">Team</Typography>
                    <Typography color="text.secondary">
                      تم تطوير البرنامج بواسطة شركة متخصصة، بالتعاون مع فريق تابع
                      لمؤسسة البرمجيات مفتوحة المصدر المرتبطة بـ Red Hat، مع
                      تركيز واضح على جودة التشغيل وقابلية الصيانة.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                className="public-card"
                sx={{
                  height: '100%',
                  borderRadius: 6,
                  bgcolor: 'background.paper'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Box className="about-icon-shell">
                      <MemoryOutlinedIcon />
                    </Box>
                    <Typography variant="h5">Technologies</Typography>
                    <Typography color="text.secondary">
                      الواجهة تعتمد على React و TypeScript و Vite و MUI، مع
                      IndexedDB و Dexie للتخزين المحلي، وتدعم TanStack Table
                      للإدخال الجدولي عالي المرونة.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card
            className="public-card"
            sx={{
              borderRadius: 6,
              bgcolor: 'background.paper'
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Grid container spacing={3} alignItems="center">
                <Grid size={{ xs: 12, md: 7 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="h5">نظرة سريعة</Typography>
                    <Typography color="text.secondary">
                      الواجهة مصممة لتشبه تطبيقات PWA الحديثة: بطاقات واضحة،
                      تدرج هادئ، تحكم مباشر، وخط عربي احترافي يدعم القراءة
                      اليومية الطويلة داخل بيئة تشغيل حقيقية.
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <div className="about-pill">PWA Ready</div>
                    <div className="about-pill">Arabic UI</div>
                    <div className="about-pill">Offline Storage</div>
                    <div className="about-pill">Approval Workflow</div>
                    <div className="about-pill">Bulk Packages</div>
                    <div className="about-pill">TanStack Table</div>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
