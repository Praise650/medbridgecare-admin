insert into public.jobs
  (title, department, location, employment_type, work_mode, summary, description, requirements, salary_range, status, custom_questions)
values
  ('Senior Frontend Engineer', 'Engineering', 'Lagos', 'full_time', 'hybrid',
   'Build fast, accessible interfaces for our core product.',
   '## About the role\nYou will own key parts of our web app...',
   '- 5+ years with React\n- Strong TypeScript\n- Accessibility experience',
   '₦ competitive', 'open',
   '[{"id":"github","label":"GitHub profile","type":"url","required":false}]'),
  ('Product Designer', 'Design', 'Remote', 'contract', 'remote',
   'Shape end-to-end product experiences.',
   '## About the role\nWork closely with product and engineering...',
   '- Portfolio of shipped work\n- Figma proficiency',
   null, 'open',
   '[{"id":"availability","label":"When can you start?","type":"select","required":true,"options":["Immediately","2 weeks","1 month+"]}]'),
  ('Marketing Intern', 'Marketing', 'Abuja', 'internship', 'onsite',
   'Support campaigns and content across channels.',
   '## About the role\nA 6-month internship...',
   '- Strong writing skills\n- Curiosity',
   null, 'draft', '[]');
