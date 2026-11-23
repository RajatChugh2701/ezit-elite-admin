-- Safe, repeatable sample data for the EZIT Elite admin portal.
-- Uses reserved .test emails and fixed IDs; existing records are left untouched.
DO $seed$
BEGIN

INSERT INTO service_categories(name) VALUES
  ('Personal Assistance'), ('Consultations'), ('Travel & Lifestyle'), ('Property & Family')
ON CONFLICT (name) DO NOTHING;

INSERT INTO pes(id,name,email,phone,city,skills,shift_start,shift_end,status) VALUES
  ('a1000000-0000-4000-8000-000000000001','Anita Sharma','anita.sharma@ezit.test','+91 98765 01001','Bengaluru','Family support, documentation, travel','09:00','18:00','Active'),
  ('a1000000-0000-4000-8000-000000000002','Arjun Mehta','arjun.mehta@ezit.test','+91 98765 01002','Mumbai','Property, banking, appointments','10:00','19:00','Active'),
  ('a1000000-0000-4000-8000-000000000003','Meera Nair','meera.nair@ezit.test','+91 98765 01003','Hyderabad','Elder care, claims, consultations','09:00','18:00','On leave')
ON CONFLICT DO NOTHING;

INSERT INTO services(id,name,category,description,cities,duration_minutes,price_inr,eligibility,status) VALUES
  ('a2000000-0000-4000-8000-000000000001','Document collection','Personal Assistance','Collect and securely deliver member documents.','Bengaluru, Mumbai, Hyderabad','120','1500','All active plans','Active'),
  ('a2000000-0000-4000-8000-000000000002','Tax consultation','Consultations','One-to-one tax consultation with a vetted expert.','Bengaluru, Mumbai, Hyderabad','60','3500','Consultation entitlement required','Active'),
  ('a2000000-0000-4000-8000-000000000003','Airport assistance','Travel & Lifestyle','Coordinate airport pickup and arrival assistance.','Bengaluru, Mumbai','180','2500','All active plans','Active'),
  ('a2000000-0000-4000-8000-000000000004','Property visit','Property & Family','Arrange a local property inspection and photo report.','Mumbai, Hyderabad','120','3000','All active plans','Active')
ON CONFLICT DO NOTHING;

INSERT INTO applications(id,name,email,phone,country,city,plan,eligibility,status) VALUES
  ('a3000000-0000-4000-8000-000000000001','Priya Kapoor','priya.kapoor@ezit.test','+91 98765 02001','India','Bengaluru','Elite 10 · India','India-based professional','Approved'),
  ('a3000000-0000-4000-8000-000000000002','Sameer Iyer','sameer.iyer@ezit.test','+91 98765 02002','India','Mumbai','Elite 1 · India','Identity verification pending','Pending'),
  ('a3000000-0000-4000-8000-000000000003','Nisha Rao','nisha.rao@ezit.test','+91 98765 02003','United States','Hyderabad','Elite 1 · NRI','Eligibility review required','Pending')
ON CONFLICT DO NOTHING;

INSERT INTO members(id,application_id,name,first_name,last_name,email,phone,city,plan,status,activated_at) VALUES
  ('a4000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Priya Kapoor','Priya','Kapoor','priya.kapoor@ezit.test','+91 98765 02001','Bengaluru','Elite 10 · India','Active',now()-interval '45 days'),
  ('a4000000-0000-4000-8000-000000000002',NULL,'Vikram Desai','Vikram','Desai','vikram.desai@ezit.test','+91 98765 02004','Mumbai','Elite 1 · India','Pending Payment',NULL),
  ('a4000000-0000-4000-8000-000000000003',NULL,'Leela Menon','Leela','Menon','leela.menon@ezit.test','+91 98765 02005','Hyderabad','Elite 10 · NRI','Active',now()-interval '120 days'),
  ('a4000000-0000-4000-8000-000000000004',NULL,'Rahul Khanna','Rahul','Khanna','rahul.khanna@ezit.test','+91 98765 02006','Bengaluru','Elite 1 · India','Suspended',NULL)
ON CONFLICT DO NOTHING;

INSERT INTO requests(id,ticket,member,service,beneficiary,city,location,scheduled_at,duration_hours,priority,status,quote_inr,notes,pe_id) VALUES
  ('a5000000-0000-4000-8000-000000000001','EZ-DEMO-001','Priya Kapoor','Document collection','Priya Kapoor','Bengaluru','Indiranagar',now()+interval '2 days','2','High','Assigned','1500','Collect and deliver signed documents.','a1000000-0000-4000-8000-000000000001'),
  ('a5000000-0000-4000-8000-000000000002','EZ-DEMO-002','Leela Menon','Airport assistance','Leela Menon','Hyderabad','Rajiv Gandhi International Airport',now()+interval '4 days','3','Normal','New','2500','Arrival assistance for visiting family.','a1000000-0000-4000-8000-000000000003'),
  ('a5000000-0000-4000-8000-000000000003','EZ-DEMO-003','Vikram Desai','Property visit','Vikram Desai','Mumbai','Bandra West',now()+interval '6 days','2','Normal','Pending Approval','3000','Property visit and photo report.','a1000000-0000-4000-8000-000000000002'),
  ('a5000000-0000-4000-8000-000000000004','EZ-DEMO-004','Priya Kapoor','Tax consultation','Priya Kapoor','Bengaluru','Video consultation',now()-interval '3 days','1','Low','Completed','3500','Annual tax planning consultation.','a1000000-0000-4000-8000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO payments(id,member,reference,kind,amount_inr,status,gateway_reference,invoice_number,paid_at) VALUES
  ('a6000000-0000-4000-8000-000000000001','Priya Kapoor','PAY-DEMO-001','Membership','100000','Paid','DEMO-GW-001','INV-DEMO-001',now()-interval '45 days'),
  ('a6000000-0000-4000-8000-000000000002','Vikram Desai','PAY-DEMO-002','Membership','15000','Pending',NULL,'INV-DEMO-002',NULL),
  ('a6000000-0000-4000-8000-000000000003','Leela Menon','PAY-DEMO-003','Membership','1600','Paid','DEMO-GW-003','INV-DEMO-003',now()-interval '120 days'),
  ('a6000000-0000-4000-8000-000000000004','Rahul Khanna','PAY-DEMO-004','Service','2500','Failed','DEMO-GW-004',NULL,NULL)
ON CONFLICT DO NOTHING;

INSERT INTO invoices(id,invoice_number,member,amount_inr,due_date,status,payment_reference) VALUES
  ('a7000000-0000-4000-8000-000000000001','INV-DEMO-001','Priya Kapoor','100000',current_date::text,'Paid','PAY-DEMO-001'),
  ('a7000000-0000-4000-8000-000000000002','INV-DEMO-002','Vikram Desai','15000',(current_date+interval '7 days')::date::text,'Unpaid',NULL),
  ('a7000000-0000-4000-8000-000000000003','INV-DEMO-003','Leela Menon','1600',(current_date-interval '5 days')::date::text,'Overdue','PAY-DEMO-003')
ON CONFLICT DO NOTHING;

INSERT INTO audit_events(actor,action,entity,entity_id,details,created_at)
SELECT 'demo@ezit.test','demo_sample','request',format('EZ-DEMO-%s',g),
       jsonb_build_object('seed_key',format('ezit-demo-audit-%s',g),'label','Demo activity — sample data'),now()-g*interval '1 day'
FROM generate_series(1,25) AS g
WHERE NOT EXISTS (
  SELECT 1 FROM audit_events a WHERE a.details->>'seed_key'=format('ezit-demo-audit-%s',g)
);

END;
$seed$;
